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

  showToast(message, type = 'warning', title = null, duration = 5000) {
    if (!message) return;

    const template = document.getElementById('tf-toast-template');
    const container = document.getElementById('tf-toast-container');
    if (!template || !container) return;

    // Prevent duplicate toast spam if exact message is currently active
    const activeMessages = Array.from(container.querySelectorAll('.tf-toast:not(.tf-toast--hiding) .tf-toast__message'));
    if (activeMessages.some((el) => el.textContent.trim() === message.trim())) {
      return;
    }

    // Limit visible toasts to 3 (auto-dismiss oldest if limit reached)
    const activeToasts = container.querySelectorAll('.tf-toast:not(.tf-toast--hiding)');
    if (activeToasts.length >= 3) {
      activeToasts[0].classList.add('tf-toast--hiding');
      setTimeout(() => activeToasts[0].remove(), 350);
    }

    const defaultTitles = {
      warning: 'Stock Limit',
      error: 'Notice',
      success: 'Updated',
      info: 'Information'
    };
    const toastTitle = title || defaultTitles[type] || 'Stock Limit';

    const toastNode = template.content.cloneNode(true);
    const toast = toastNode.querySelector('.tf-toast');
    toast.classList.add(`tf-toast--${type}`);
    toast.style.setProperty('--toast-duration', `${duration}ms`);
    if (type === 'error') {
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
    }

    const tagEl = toast.querySelector('.tf-toast__tag');
    if (tagEl) tagEl.textContent = toastTitle;

    const msgEl = toast.querySelector('.tf-toast__message');
    if (msgEl) msgEl.textContent = message;

    container.appendChild(toast);

    // Trigger smooth GPU entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('tf-toast--visible');
      });
    });

    let dismissTimer = null;
    let remainingTime = duration;
    let startTime = Date.now();

    const removeToast = () => {
      clearTimeout(dismissTimer);
      toast.classList.remove('tf-toast--visible');
      toast.classList.add('tf-toast--hiding');
      setTimeout(() => {
        toast.remove();
      }, 350);
    };

    const startTimer = () => {
      startTime = Date.now();
      dismissTimer = setTimeout(removeToast, remainingTime);
    };

    const pauseTimer = () => {
      clearTimeout(dismissTimer);
      remainingTime -= (Date.now() - startTime);
      if (remainingTime < 400) remainingTime = 400;
    };

    toast.querySelector('.tf-toast__close')?.addEventListener('click', removeToast, { once: true });
    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', startTimer);

    startTimer();
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    if (input) {
      input.value = input.getAttribute('value');
    }
  }

  validateQuantity(event) {
    const input = event.target;
    const inputValue = parseInt(input.value) || 0;
    const index = input.dataset.index;
    let message = '';
    let targetQuantity = inputValue;

    if (inputValue === 0) {
      this.updateQuantity(
        index,
        0,
        document.activeElement ? document.activeElement.getAttribute('name') : null,
        input.dataset.quantityVariantId
      );
      return;
    }

    const min = input.dataset.min ? parseInt(input.dataset.min) : null;
    const max = input.max ? parseInt(input.max) : null;
    const step = input.step ? parseInt(input.step) : 1;

    if (min !== null && inputValue < min) {
      message = (window.cartStrings?.quantityError || 'Minimum quantity is [quantity]').replace('[quantity]', min);
      targetQuantity = min;
      input.value = min;
    } else if (max !== null && max > 0 && inputValue > max) {
      message = (window.cartStrings?.quantityError || 'You can only add [quantity] of this item').replace('[quantity]', max);
      targetQuantity = max;
      input.value = max;
    } else if (step > 1 && inputValue % step !== 0) {
      message = (window.cartStrings?.quantityError || 'Please select a valid quantity step').replace('[quantity]', step);
      this.resetQuantityInput(index);
      targetQuantity = parseInt(input.value) || 1;
    }

    const currentQuantity = parseInt(input.getAttribute('value')) || 0;

    if (message) {
      this.showToast(message, 'warning', 'Stock Limit');
      this.updateLiveRegions(index, message);
    }

    if (targetQuantity === currentQuantity) {
      input.value = currentQuantity;
      return;
    }

    this.updateQuantity(
      index,
      targetQuantity,
      document.activeElement ? document.activeElement.getAttribute('name') : null,
      input.dataset.quantityVariantId
    );
  }

  onChange(event) {
    if (event.target === null) return;
    
    if (event.target.name === 'updates[]') {
      this.validateQuantity(event);
    }
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
      },
      {
        id: 'cart-total-price',
        section: 'cart-total-price',
        selector: '.shopify-section'
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

  updateQuantity(line, quantity, name, variantId) {
    this.enableLoading(line);
    const requestedQuantity = parseInt(quantity);
    const sections = this.getSectionsToRender().map((section) => section.section || section.id);

    const body = JSON.stringify({
      line,
      quantity,
      sections: sections,
      sections_url: window.location.pathname
    });

    fetch(`${window.routes.cart_change_url}`, { ...fetchConfig(), body })
      .then((response) => response.json())
      .then((parsedState) => {
        const quantityEl = document.getElementById(`Quantity-${line}`);
        const errorMessage = parsedState.errors || parsedState.description || (parsedState.status === 422 ? parsedState.message : null);

        if (errorMessage) {
          const updatedValue = parsedState.items && parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          if (quantityEl && updatedValue !== undefined) {
            quantityEl.value = updatedValue;
          }
          const errorStr = typeof errorMessage === 'string'
            ? errorMessage
            : (Array.isArray(errorMessage) ? errorMessage.join('; ') : (window.cartStrings?.error || 'Error updating cart'));
          this.showToast(errorStr, 'warning', 'Stock Notice');
          this.updateLiveRegions(line, errorStr);
          this.disableLoading();
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartFooter = document.getElementById('main-cart-footer');
        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elements = document.querySelectorAll(`.${section.id}, #${section.id}`);
          elements.forEach((element) => {
            if (element) {
              const elementToReplace = element.querySelector(section.selector) || element;
              if (elementToReplace && parsedState.sections && parsedState.sections[section.section || section.id]) {
                elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section || section.id], section.selector);
              }
            }
          });
        });

        const lineItemEl = document.getElementById(`CartItem-${line}`);
        const currentVariantId = variantId || lineItemEl?.dataset.variantId;
        const updatedItem = (currentVariantId && parsedState.items?.find(i => i.variant_id?.toString() === currentVariantId?.toString() || i.id?.toString() === currentVariantId?.toString())) || (parsedState.items && parsedState.items[line - 1]);
        const updatedValue = updatedItem ? updatedItem.quantity : undefined;

        let message = '';
        if (requestedQuantity > 0 && updatedValue !== undefined && updatedValue > 0 && updatedValue < requestedQuantity) {
          message = (window.cartStrings?.quantityError || 'You can only add [quantity] of this item.').replace('[quantity]', updatedValue);
          const freshQtyEl = document.getElementById(`Quantity-${line}`);
          if (freshQtyEl) freshQtyEl.value = updatedValue;
          this.showToast(message, 'warning', 'Stock Limit');
        }
        this.updateLiveRegions(line, message);

        const lineItem = document.getElementById(`CartItem-${line}`);
        if (lineItem && name) {
          const target = lineItem.querySelector(`[name="${name}"]`);
          if (target) target.focus();
        }
        this.disableLoading();

        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { cart: parsedState }
        }));
      })
      .catch(() => {
        this.disableLoading();
        const err = window.cartStrings?.error || 'Error updating cart';
        this.showToast(err, 'error', 'Error');
        if (this.cartErrors) {
          this.cartErrors.textContent = err;
        }
      });
  }

  updateLiveRegions(line, message = '') {
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    if (cartStatus && message) {
      cartStatus.textContent = message;
      cartStatus.setAttribute('aria-hidden', false);

      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', true);
      }, 1000);
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

    const miniCartItem = document.querySelector('#mini-cart .tf-mini-cart-items');
    if (miniCartItem) miniCartItem.classList.add('cart__items--disabled');

    const loadingOverlay = this.querySelectorAll('.tf-loading')[line - 1];
    if (loadingOverlay) {
      loadingOverlay.classList.add('loading');
      const parent = loadingOverlay.parentElement;
      if (parent) {
        parent.querySelectorAll('.cart-item__discounted-prices, .cart_total').forEach((el) => el.classList.add('hidden'));
      }
    }
    
    document.activeElement?.blur?.();
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    const cartItems = document.getElementById('main-cart-items');
    if (cartItems) cartItems.classList.remove('cart__items--disabled');

    const miniCartItem = document.querySelector('#mini-cart .tf-mini-cart-items');
    if (miniCartItem) miniCartItem.classList.remove('cart__items--disabled');

    this.querySelectorAll('.tf-loading.loading, .loading-overlay').forEach((el) => {
      el.classList.remove('loading');
      el.classList.add('hidden');
      const parent = el.parentElement;
      if (parent) {
        parent.querySelectorAll('.cart-item__discounted-prices, .cart_total').forEach((p) => p.classList.remove('hidden'));
      }
    });

    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);
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

window.showToast = function(message, type = 'warning', title = null, duration = 5000) {
  const cartItems = document.querySelector('cart-items');
  if (cartItems && typeof cartItems.showToast === 'function') {
    cartItems.showToast(message, type, title, duration);
  } else {
    CartItems.prototype.showToast(message, type, title, duration);
  }
};

document.addEventListener('toast:show', (e) => {
  const { message, type, title, duration } = e.detail || {};
  if (message && window.showToast) {
    window.showToast(message, type, title, duration);
  }
});

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
