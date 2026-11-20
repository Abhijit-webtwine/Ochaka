/**
 * Exit Popup (Before You Leave) Component - Modave & Ochaka Themes
 * High-performance exit intent modal with multi-trigger support and Bootstrap 5 integration.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'theme-exit-popup';

  class ExitPopup extends HTMLElement {
    constructor() {
      super();
      this.isOpen = false;
      this.isTriggered = false;
      this.bsModal = null;
    }

    connectedCallback() {
      this.config = this.getConfig();
      this.bindModalEvents();

      // Theme Editor support (auto preview on section select)
      if (window.Shopify && window.Shopify.designMode) {
        document.addEventListener('shopify:section:select', (e) => {
          if (this.contains(e.target) || e.target.contains(this) || e.target.id === this.id) {
            this.open();
          }
        });
        document.addEventListener('shopify:section:deselect', (e) => {
          if (this.contains(e.target) || e.target.contains(this) || e.target.id === this.id) {
            this.close();
          }
        });
      }

      // Check if popup is enabled in settings and not dismissed
      if (!this.config.enabled || this.isDismissed()) {
        return;
      }

      this.initTriggers();

      // Expose test helpers globally for debugging / merchant preview
      window.showExitPopup = () => this.open();
      window.closeExitPopup = () => this.close();
      window.resetExitPopup = () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        console.log('Exit popup frequency reset.');
      };
    }

    getConfig() {
      const configScript = this.querySelector('script[type="application/json"]');
      if (configScript) {
        try {
          return JSON.parse(configScript.textContent);
        } catch (e) {}
      }
      return {
        enabled: true,
        trigger: 'exit_intent',
        timeDelay: 15,
        scrollDepth: 50,
        frequencyDays: 7,
      };
    }

    isDismissed() {
      // URL parameter ?preview_exit_popup or ?exit_popup overrides dismissal for testing
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('preview_exit_popup') || urlParams.has('exit_popup')) return false;

      // Always allow in theme customizer
      if (window.Shopify && window.Shopify.designMode) return false;

      // Check frequency expiration
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        return Boolean(data && data.dismissed && (!data.expiresAt || data.expiresAt > Date.now()));
      } catch (e) {
        return false;
      }
    }

    dismiss() {
      const days = parseInt(this.config.frequencyDays, 10);
      if (!isNaN(days) && days > 0) {
        const payload = {
          dismissed: true,
          expiresAt: Date.now() + days * 86400000,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {}
      }
    }

    initTriggers() {
      const isMobile = window.matchMedia('(max-width: 767px)').matches || 'ontouchstart' in window;

      // Exit Intent (Desktop only: detects cursor moving up towards browser chrome / leaving viewport)
      if (this.config.trigger === 'exit_intent' && !isMobile) {
        this.exitIntentHandler = (e) => {
          if (this.isTriggered) return;
          const fromTop = e.clientY <= 20;
          const noTarget = !e.relatedTarget && !e.toElement;
          if ((noTarget && fromTop) || (e.type === 'mouseleave' && fromTop)) {
            this.trigger();
          }
        };
        document.addEventListener('mouseout', this.exitIntentHandler);
        document.documentElement.addEventListener('mouseleave', this.exitIntentHandler);
      }

      // Time Delay (or Mobile Fallback when trigger is exit_intent on touch devices)
      if (this.config.trigger === 'time' || (this.config.trigger === 'exit_intent' && isMobile)) {
        const delay = (parseInt(this.config.timeDelay, 10) || 15) * 1000;
        this.timer = setTimeout(() => {
          this.trigger();
        }, delay);
      }

      // Scroll Depth Trigger
      if (this.config.trigger === 'scroll') {
        const targetDepth = parseInt(this.config.scrollDepth, 10) || 50;
        this.scrollHandler = () => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight > 0) {
            const scrollPercent = (window.scrollY / scrollHeight) * 100;
            if (scrollPercent >= targetDepth && !this.isTriggered) {
              this.trigger();
              window.removeEventListener('scroll', this.scrollHandler);
            }
          }
        };
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
    }

    trigger() {
      if (this.isTriggered || this.isDismissed()) return;
      this.isTriggered = true;
      this.cleanupTriggers();
      this.open();
    }

    cleanupTriggers() {
      if (this.exitIntentHandler) {
        document.removeEventListener('mouseout', this.exitIntentHandler);
        document.documentElement.removeEventListener('mouseleave', this.exitIntentHandler);
      }
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler);
      }
      if (this.timer) {
        clearTimeout(this.timer);
      }
    }

    bindModalEvents() {
      // Close button and elements with [data-exit-popup-close] or .btn-hide-popup
      this.querySelectorAll('[data-exit-popup-close], .btn-hide-popup').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          if (btn.tagName === 'A' && btn.getAttribute('href') && btn.getAttribute('href') !== '#') {
            this.dismiss();
            return;
          }
          e.preventDefault();
          this.close();
        });
      });

      // Dismiss popup when clicking any product or collection link inside the modal
      this.querySelectorAll('a[href]').forEach((link) => {
        link.addEventListener('click', () => {
          this.dismiss();
        });
      });

      // Click outside dialog to close (backdrop click on modal element itself)
      this.addEventListener('click', (e) => {
        if (e.target === this) {
          this.close();
        }
      });

      // Escape key to close
      this.escHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escHandler);

      // Bootstrap modal hidden event listener
      this.addEventListener('hidden.bs.modal', () => {
        this.isOpen = false;
        this.dismiss();
        this.cleanupBackdrop();
      });

      // 1-Click Copy Coupon Code
      this.querySelectorAll('[data-exit-popup-copy]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const code = btn.getAttribute('data-exit-popup-copy');
          if (!code) return;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
              this.showCopyFeedback(btn);
            }).catch(() => {
              this.copyFallback(code, btn);
            });
          } else {
            this.copyFallback(code, btn);
          }
        });
      });
    }

    copyFallback(code, btn) {
      const input = document.createElement('input');
      input.setAttribute('value', code);
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        this.showCopyFeedback(btn);
      } catch (err) {}
      document.body.removeChild(input);
    }

    showCopyFeedback(btn) {
      const textEl = btn.querySelector('.text') || btn;
      const originalText = textEl.textContent;
      textEl.textContent = 'COPIED!';
      btn.classList.add('btn-copied');

      setTimeout(() => {
        textEl.textContent = originalText;
        btn.classList.remove('btn-copied');
      }, 2500);
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;

      if (window.bootstrap && window.bootstrap.Modal) {
        this.bsModal = window.bootstrap.Modal.getOrCreateInstance(this);
        this.bsModal.show();
      } else {
        this.classList.add('show');
        this.style.display = 'block';
        this.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        if (!document.querySelector('.modal-backdrop.exit-popup-backdrop')) {
          this.backdrop = document.createElement('div');
          this.backdrop.className = 'modal-backdrop fade show exit-popup-backdrop';
          this.backdrop.addEventListener('click', () => this.close());
          document.body.appendChild(this.backdrop);
        }
      }
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.dismiss();

      if (window.bootstrap && window.bootstrap.Modal) {
        const inst = window.bootstrap.Modal.getInstance(this) || this.bsModal;
        if (inst) {
          inst.hide();
        }
      }

      // Ensure elements, backdrop, and body classes are always cleanly reset
      setTimeout(() => {
        this.classList.remove('show');
        this.style.display = 'none';
        this.setAttribute('aria-hidden', 'true');
        this.cleanupBackdrop();
      }, 250);
    }

    cleanupBackdrop() {
      document.querySelectorAll('.modal-backdrop.exit-popup-backdrop').forEach((el) => el.remove());
      // Only remove modal-open if no other bootstrap modals are visible
      if (!document.querySelector('.modal.show:not(.exit-popup)')) {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
      }
    }

    disconnectedCallback() {
      this.cleanupTriggers();
      if (this.escHandler) {
        document.removeEventListener('keydown', this.escHandler);
      }
      this.cleanupBackdrop();
    }
  }

  if (!customElements.get('exit-popup')) {
    customElements.define('exit-popup', ExitPopup);
  }
})();