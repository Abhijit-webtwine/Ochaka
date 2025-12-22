class MobileDock extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const header = document.getElementById('shopify-section-header');

    this.isAction = false;
    this.scrollY = Shopify && Shopify.designMode ? 0 : parseInt(header.getBoundingClientRect().bottom);

    this.querySelectorAll('.dock__item[data-action]').forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
    document.addEventListener('menudrawer:close', this.hideStickyHeader.bind(this));
    document.addEventListener('searchmodal:close', this.hideStickyHeader.bind(this));

    this.onScrollHandler = this.onScroll.bind(this);
    window.addEventListener('scroll', this.onScrollHandler, false);
    this.onScrollHandler();

    document.documentElement.style.setProperty('--mobile-dock-height', `${this.offsetHeight}px`);
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScrollHandler);
  }

  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop >= this.scrollY) {
      this.classList.add('is-active');
    }
    else {
      this.classList.remove('is-active');
    }
  }

  onButtonClick(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const delay = this.waitStickyHeader();

    switch (target.dataset.action) {
      case 'cart':
        this.isAction = true;

        const miniCart = document.querySelector('mini-cart');
        setTimeout(() => {
          miniCart.open();
          document.activeElement.blur();
        }, delay);
        break;

      case 'menu':
        this.isAction = true;

        const headerDrawer = document.querySelector('header-drawer');
        setTimeout(() => {
          headerDrawer.openMenuDrawer();
        }, delay);
        break;

      case 'search':
        this.isAction = true;
        
        document.querySelectorAll('search-modal').forEach((searchModal) => {
          const style = window.getComputedStyle(searchModal);
          if (style.display === 'none') {
            return;
          }

          setTimeout(() => {
            searchModal.open();
            searchModal.querySelector('input:not([type="hidden"])').focus();
          }, delay);
        });
        break;
    }
  }

  hideStickyHeader() {
    const header = document.querySelector('sticky-header');
    if (header === null) return;

    if (theme.config.mqlSmall && this.isAction && header.sticky()) {
      setTimeout(() => {
        header.hide();
        this.isAction = false;
      }, 500);
    }
  }

  waitStickyHeader() {
    const header = document.querySelector('sticky-header');
    if (header === null) return;

    if (!header.sticky() && !this.isElementVisible(header)) {
      header.hide();
      setTimeout(() => header.reveal());

      return 250;
    }

    return 0;
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect(),
        width  = window.innerWidth || document.documentElement.clientWidth,
        height = window.innerHeight || document.documentElement.clientHeight,
        efp    = function (x, y) { return document.elementFromPoint(x, y) };

    // Return false if it's not in the viewport
    if (rect.right < 0 || rect.bottom < 0 || rect.left > width || rect.top > height) {
      return false;
    }

    // Return true if any of its four corners are visible
    return (
      element.contains(efp(rect.left,  rect.top))
      || element.contains(efp(rect.right, rect.top))
      || element.contains(efp(rect.right, rect.bottom))
      || element.contains(efp(rect.left,  rect.bottom))
      || element.parentNode.contains(efp(rect.left,  rect.top))
      || element.parentNode.contains(efp(rect.right, rect.top))
      || element.parentNode.contains(efp(rect.right, rect.bottom))
      || element.parentNode.contains(efp(rect.left,  rect.bottom))
    );
  }
}
customElements.define('mobile-dock', MobileDock);
