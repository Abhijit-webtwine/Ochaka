class MiniCart extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // this.header = document.querySelector('sticky-header');
    this.drawer = document.querySelector('cart-drawer-open');
    
    // Load cart immediately when component is connected
    this.loadCart();
  }

  async loadCart() {
    try {
      const response = await fetch(this.dataset.url);
      const html = await response.text();
      
      // Update the mini-cart content
      const miniCart = document.getElementById('mini-cart');
      if (miniCart) {
        const existingRecommendations = miniCart.querySelector('cart-recommendations');
        const existingRecommendationsHtml = existingRecommendations ? existingRecommendations.innerHTML : null;

        const nextInnerHtml = this.getSectionInnerHTML(html, '.shopify-section');

        // If recommendations already loaded once, preserve them to avoid re-fetch on re-render.
        if (existingRecommendationsHtml && existingRecommendationsHtml.trim().length) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = nextInnerHtml;
          const nextRecommendations = wrapper.querySelector('cart-recommendations');
          if (nextRecommendations) {
            nextRecommendations.innerHTML = existingRecommendationsHtml;
          }
          miniCart.innerHTML = wrapper.innerHTML;
        } else {
          miniCart.innerHTML = nextInnerHtml;
        }
      }
      
      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('cartdrawer:loaded'));
      
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }

  open() {
    // Close other drawers/modals first
    document.body.classList.remove('wishlist-drawer--open');
    const qv = document.getElementById('quickView');
    if (qv && window.bootstrap?.Modal) {
      bootstrap.Modal.getInstance(qv)?.hide();
    }

    const drawer = this.drawer || document.querySelector('cart-drawer-open');
    if (drawer && typeof drawer.openDrawer === 'function') {
      drawer.openDrawer();
    } else {
      document.body.classList.add('cart-drawer--open', 'overflow-hidden');
    }
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;

    const mainCartItems = document.getElementById('main-cart-items');
    if (mainCartItems) {
      const isCartEmpty = parsedState.item_count !== undefined ? parsedState.item_count === 0 : false;
      mainCartItems.classList.toggle('is-empty', isCartEmpty);
      const cartFooter = document.getElementById('main-cart-footer');
      if (cartFooter) cartFooter.classList.toggle('is-empty', isCartEmpty);
    }

    this.getSectionsToRender().forEach((section) => {
      // Find ALL elements that match either class or ID for this section
      // This handles both single and multiple instances (like sticky header + main header)
      const elements = document.querySelectorAll(`.${section.id}, #${section.id}`);
      elements.forEach((element) => {
        if (element) {
          const html = parsedState.sections?.[section.section] || parsedState.sections?.[section.id];
          if (html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            if (element.tagName === 'CART-ITEMS' || element.id === 'main-cart-items') {
              const newCartItems = doc.querySelector('cart-items, #main-cart-items');
              if (newCartItems) {
                element.className = newCartItems.className;
              } else {
                element.classList.remove('is-empty');
              }
            }

            const target = element.querySelector(section.selector) || element;
            const newContent = doc.querySelector(section.selector);
            if (target && newContent) {
              target.innerHTML = newContent.innerHTML;
            } else {
              target.innerHTML = this.getSectionInnerHTML(html, section.selector);
            }
          }
        }
      });
    });

    const isCartPage = document.body.classList.contains('template-cart') || (window.shopSettings && window.shopSettings.cartDrawer === false);
    if (!isCartPage) {
      this.open();
    }

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { cart: parsedState }
    }));
  }

  getSectionsToRender() {
    const mainCartElement = document.getElementById('main-cart-items');
    const isCartPage = document.body.classList.contains('template-cart') || !!mainCartElement || (window.shopSettings && window.shopSettings.cartDrawer === false);
    const mainCartSectionId = mainCartElement?.dataset.id || 'main-cart-items';

    const sections = [
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'mobile-cart-icon-bubble',
        section: 'mobile-cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-total-price',
        section: 'cart-total-price',
        selector: '.shopify-section'
      }
    ];

    if (isCartPage) {
      sections.push({
        id: 'main-cart-items',
        section: mainCartSectionId,
        selector: '.js-contents'
      });
      sections.push({
        id: 'js-cart-summary',
        section: mainCartSectionId,
        selector: '.js-summary-contents'
      });
      if (document.querySelector('#main-cart-footer .free-shipping')) {
        sections.push({
          id: 'main-cart-footer',
          section: 'main-cart-footer',
          selector: '.free-shipping'
        });
      }
    } else {
      sections.push({
        id: 'mini-cart',
        section: 'mini-cart',
        selector: '.shopify-section'
      });
    }

    return sections;
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const element = doc.querySelector(selector);
    return element ? element.innerHTML : '';
  }
}

customElements.define('mini-cart', MiniCart);