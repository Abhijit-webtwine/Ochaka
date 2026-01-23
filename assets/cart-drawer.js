class MiniCart extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // this.header = document.querySelector('sticky-header');
    this.drawer = document.querySelector('cart-drawer');
    
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
    const detailsElement = this.drawer?.querySelector('details');
    if (!detailsElement || detailsElement.hasAttribute('open')) {
      return;
    }
    
    this.drawer.openMenuDrawer();
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        element.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id], 
          section.selector
        );
      }
    });

    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'mini-cart',
        section: 'mini-cart',
        selector: '.shopify-section'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'bottom-toolbar',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'mobile-cart-icon-bubble',
        section: 'mobile-cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const element = doc.querySelector(selector);
    return element ? element.innerHTML : '';
  }
}

customElements.define('mini-cart', MiniCart);