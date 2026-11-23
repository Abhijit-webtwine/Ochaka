(function () {
  'use strict';
  const STORAGE_KEY = 'theme-age-gate';

  class AgeGate {
    constructor(container) {
      this.el = container;
      const configEl = container.querySelector('#AgeGateConfig');
      this.config = configEl ? JSON.parse(configEl.textContent || '{}') : {};
      this.storage = this.config.persistence === 'session' ? window.sessionStorage : window.localStorage;

      if (!this.config.enabled || this.isVerified()) {
        this.el.hidden = true;
        return;
      }

      this.initElements();
      this.bindEvents();
    }

    isVerified() {
      try {
        const data = JSON.parse(this.storage.getItem(STORAGE_KEY) || 'null');
        return data && data.verified && (!data.expiresAt || data.expiresAt > Date.now());
      } catch (e) {
        return false;
      }
    }

    verify() {
      const days = parseInt(this.config.durationDays, 10) || 30;
      const payload = {
        verified: true,
        expiresAt: this.config.persistence === 'days' ? Date.now() + days * 86400000 : null,
      };
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}

      document.documentElement.classList.add('age-gate-verified');
      this.el.hidden = true;
      document.body.classList.remove('age-gate-open');
    }

    initElements() {
      this.dobInput = this.el.querySelector('.age-gate__input[name="dob"]');
      this.errorEl = this.el.querySelector('.age-gate__error');
      this.rejectionEl = this.el.querySelector('.age-gate__rejection');
      this.bodyContent = this.el.querySelector('.age-gate__body');
      document.body.classList.add('age-gate-open');
      this.el.removeAttribute('hidden');
    }

    handleDob() {
      if (!this.dobInput || !this.dobInput.value) {
        return this.showError(this.config.invalidDateError || 'Please enter a valid date of birth.');
      }

      const parts = this.dobInput.value.split('-');
      if (parts.length !== 3) {
        return this.showError(this.config.invalidDateError || 'Please enter a valid date of birth.');
      }

      const birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const today = new Date();

      if (isNaN(birthDate.getTime()) || birthDate > today) {
        return this.showError(this.config.invalidDateError || 'Please enter a valid date of birth.');
      }

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const minAge = parseInt(this.config.minAge, 10) || 18;
      if (age >= minAge) {
        this.verify();
      } else {
        const errorTemplate = this.config.underageError || 'Sorry, you must be at least [min_age] years old to enter.';
        this.showError(errorTemplate.replace(/\[min_age\]/g, String(minAge)));
      }
    }

    showError(msg) {
      if (!this.errorEl) return;
      const text = this.errorEl.querySelector('.age-gate__error-text') || this.errorEl;
      text.textContent = msg;
      this.errorEl.removeAttribute('hidden');
      if (this.dobInput) {
        this.dobInput.focus();
      }
    }

    handleReject() {
      if (this.config.rejectionAction === 'redirect' && this.config.rejectionUrl) {
        window.location.href = this.config.rejectionUrl;
      } else {
        if (this.bodyContent) this.bodyContent.hidden = true;
        if (this.rejectionEl) this.rejectionEl.removeAttribute('hidden');
        if (this.errorEl) this.errorEl.hidden = true;
      }
    }

    bindEvents() {
      this.el.querySelector('[data-age-gate-confirm]')?.addEventListener('click', () => this.verify());
      this.el.querySelector('[data-age-gate-reject]')?.addEventListener('click', () => this.handleReject());
      this.el.querySelector('[data-age-gate-submit]')?.addEventListener('click', () => this.handleDob());
      this.dobInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleDob();
        }
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-age-gate]').forEach((el) => {
      if (!el._ageGate) el._ageGate = new AgeGate(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Shopify theme editor support
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:select', (e) => {
      if (e.target.matches('.section-age-gate, [data-age-gate]')) {
        const ageGateEl = document.querySelector('[data-age-gate]');
        if (ageGateEl) {
          ageGateEl.removeAttribute('hidden');
          document.body.classList.add('age-gate-open');
        }
      }
    });

    document.addEventListener('shopify:section:deselect', (e) => {
      if (e.target.matches('.section-age-gate, [data-age-gate]')) {
        const ageGateEl = document.querySelector('[data-age-gate]');
        if (ageGateEl) {
          ageGateEl.setAttribute('hidden', '');
          document.body.classList.remove('age-gate-open');
        }
      }
    });
  }
})();
