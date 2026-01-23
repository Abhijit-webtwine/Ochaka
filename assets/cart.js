class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);

class CartDiscount extends HTMLElement {
  constructor() {
    super();

    this.onSubmitBound = this.onSubmit.bind(this);
    this.onClickBound = this.onClick.bind(this);

    this.addEventListener('submit', this.onSubmitBound);
    this.addEventListener('click', this.onClickBound);
  }

  onClick(event) {
    const removeBtn = event.target.closest('.cart-discount-remove');
    if (!removeBtn || !this.contains(removeBtn)) return;
    this.onRemove(event);
  }

  onRemove(event) {
    console.log('done');
    event.preventDefault();
    
    // Clear the input field if it exists
    const input = this.querySelector('input[name="discount"]');
    if (input) {
      input.value = '';
    }
    
    // Apply empty discount to remove
    this.applyDiscount('');
  }

  // Shared function to handle discount error visibility
  handleDiscountErrors(parsedState) {
    const errorEl = document.querySelectorAll('.cart-discount-error');
    if (!errorEl) return;

    const hasInvalidDiscount = parsedState.discount_codes?.some(d => d.applicable === false);
    
    if (hasInvalidDiscount) {
      errorEl.forEach(el => el.classList.remove('hidden'));

      //Remove discount after wrong added
      const body = JSON.stringify({
        discount: '',
      });
      fetch(routes.cart_update_url, {...fetchConfig(), ...{ body }})
      
    } else {
      errorEl.forEach(el => el.classList.add('hidden'));
    }
  }

  applyDiscount(code) {
    this.enableLoading();

    const cartItems = document.querySelector('cart-items');
    const sectionsToRender = cartItems?.getSectionsToRender() || [];

    const body = JSON.stringify({
      discount: code,
      sections: sectionsToRender.map(s => s.section),
      sections_url: window.location.pathname
    });

    fetch(routes.cart_update_url, {...fetchConfig(), ...{ body }})
    .then(res => res.json())
    .then(parsedState => {
      
      this.disableLoading();

      // 1. Re-render sections
      sectionsToRender.forEach(section => {
        
        const container = document.getElementById(section.id);
        if (!container) return;

        const html = parsedState.sections?.[section.section];
        if (!html) return;

        const target = container.querySelector(section.selector) || container;
        target.innerHTML = cartItems.getSectionInnerHTML(html, section.selector);
      });

      // 2. Handle discount errors using shared function
      this.handleDiscountErrors(parsedState);

      // 3. Notify system
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { cart: parsedState }
      }));
    })
    .catch(() => {
      this.disableLoading();
    });
  }

  onSubmit(event) {
    event.preventDefault();

    const input = this.querySelector('input[name="discount"]');
    const code = input ? input.value.trim() : '';
    
    this.applyDiscount(code);
  }

  enableLoading() {
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Applying...';
    }
  }

  disableLoading() {
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Apply Code';
    }
  }
}

customElements.define('cart-discount', CartDiscount);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');
    this.cartErrors = document.getElementById('cart-errors');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
      .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    if (event.target === null) return;
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    let sections = [
      {
        id: 'mini-cart',
        section: 'mini-cart',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-items',
        section: 'main-cart-items',
        selector: '.js-contents',
      },
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
        id: 'js-cart-summary',
        section: 'main-cart-items',
        selector: '.js-summary-contents',
      }
    ];
    if (document.querySelector('#main-cart-footer .free-shipping')) {
      sections.push({
        id: 'main-cart-footer',
        section: 'main-cart-footer',
        selector: '.free-shipping',
      });
    }
    return sections;
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    const sections = this.getSectionsToRender().map((section) => section.section);

    const body = JSON.stringify({
      line,
      quantity,
      sections: sections,
      sections_url: window.location.pathname
    });

    fetch(`${window.routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section => {
          const element = document.getElementById(section.id);
          if (element) {
            const elementToReplace = element.querySelector(section.selector) || element;

            if (elementToReplace && parsedState.sections[section.section]) {
              elementToReplace.innerHTML =
                this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
            }
          }
        }));

        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem = document.getElementById(`CartItem-${line}`);
        if (lineItem && name) lineItem.querySelector(`[name="${name}"]`).focus();
        this.disableLoading();

        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: {
            cart: state
          }
        }));
      })
      .catch(() => {
        this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
        this.disableLoading();
        if (this.cartErrors) {
          this.cartErrors.textContent = window.cartStrings.error;
        }
      });
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const quantityError = document.getElementById(`Line-item-error-${line}`);
      if (quantityError) {
        quantityError.querySelector('.cart-item__error-text')
          .innerHTML = window.cartStrings.quantityError.replace(
            '[quantity]',
            document.getElementById(`Quantity-${line}`).value
          ); 
      }
    }

    this.currentItemCount = itemCount;
    
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    if (cartStatus) {
      cartStatus.setAttribute('aria-hidden', false);

      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', true);
      }, 1e3);
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector)?.innerHTML;
  }

  enableLoading(line) {
    const cartItems = document.getElementById('main-cart-items');
    if (cartItems) cartItems.classList.add('cart__items--disabled');

    const loadingOverlay = this.querySelectorAll('.loading-overlay')[line - 1];
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    
    document.activeElement.blur();
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    const cartItems = document.getElementById('main-cart-items');
    if (cartItems) cartItems.classList.remove('cart__items--disabled');
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section => {
      const element = document.getElementById(section.id);

      if (element) {
        element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      }
    }));
  }
}
customElements.define('cart-items', CartItems);

class CartNote extends HTMLElement {
  constructor() {
    super();

    // this.addEventListener('change', debounce((event) => {
    //   const body = JSON.stringify({ note: event.target.value });
    //   fetch(`${window.routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
    // }, 300));

    const textarea = this.querySelector('textarea[name="note"]');
    const saveButton = this.querySelector('button[type="submit"]');

    if (textarea && saveButton) {
      saveButton.addEventListener('click', (event) => {
        event.preventDefault();

        const body = JSON.stringify({ note: textarea.value });
        fetch(`${window.routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });

        this.classList.remove('open');
      });
    }
  }
}
customElements.define('cart-note', CartNote);

class ShippingCalculator extends HTMLElement {
  constructor() {
    super();

    this.setupCountries();
    
    this.errors = this.querySelector('#ShippingCalculatorErrors');
    this.success = this.querySelector('#ShippingCalculatorSuccess');
    this.zip = this.querySelector('#ShippingCalculatorZip');
    this.country = this.querySelector('#ShippingCalculatorCountry');
    this.province = this.querySelector('#ShippingCalculatorProvince');
    this.button = this.querySelector('button');
    this.button.addEventListener('click', this.onSubmitHandler.bind(this));
  }

  setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector('ShippingCalculatorCountry', 'ShippingCalculatorProvince', {
        hideElement: 'ShippingCalculatorProvinceContainer'
      });
    }
  }

  onSubmitHandler(event) {
    event.preventDefault();
    
    this.errors.classList.add('hidden');
    this.success.classList.add('hidden');
    this.zip.classList.remove('invalid');
    this.country.classList.remove('invalid');
    this.province.classList.remove('invalid');
    this.button.classList.add('loading');
    this.button.setAttribute('disabled', true);

    const body = JSON.stringify({
      shipping_address: {
        zip: this.zip.value,
        country: this.country.value,
        province: this.province.value
      }
    });
    let sectionUrl = `${window.routes.cart_url}/shipping_rates.json`;

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    fetch(sectionUrl, { ...fetchConfig('javascript'), body })
      .then((response) => response.json())
      .then((parsedState) => {
        if (parsedState.shipping_rates) {
          this.success.classList.remove('hidden');
          this.success.innerHTML = '';
          
          parsedState.shipping_rates.forEach((rate) => {
            const child = document.createElement('p');
            const staticChild = document.createElement('p');
            staticChild.innerText = 'We found an available shipping rate for your address:';
            child.classList.add('standard');
            if(rate.name == 'Standard'){
              child.innerHTML = `${rate.name}: ${rate.price} ${Shopify.currency.active}`;
              this.success.appendChild(staticChild);
              this.success.appendChild(child);
            }
          });
        }
        else {
          let errors = [];
          Object.entries(parsedState).forEach(([attribute, messages]) => {
            errors.push(`${attribute.charAt(0).toUpperCase() + attribute.slice(1)} ${messages[0]}`);
          });

          this.errors.classList.remove('hidden');
          this.errors.querySelector('.errors').innerHTML = 'Enter a valid ZIP code for the country';
        }
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        this.button.classList.remove('loading');
        this.button.removeAttribute('disabled');
      });
  }
}

customElements.define('shipping-calculator', ShippingCalculator);
