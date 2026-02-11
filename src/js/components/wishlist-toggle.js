import BaseStorageElement from '../helpers/base-storage.js'

class WishlistToggle extends BaseStorageElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.STORAGE_KEY = 'wishlist-items';
    this.EVENT_NAME = 'wishlist:updated';
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    this.setupEventListeners();
    this.updateState();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListeners();
  }

  updateState(items = null) {
    const handle = this.productHandle;
    if (!handle) return;

    if (!items) {
      items = this.getStorageItems(this.STORAGE_KEY);
    }

    const inWishlist = items.includes(handle);
    const icon = this.querySelector('.icon');
    const shouldUpdateIcon = this.dataset.updateIcon !== 'false';

    if (inWishlist) {
      this.classList.add('active');
      if (icon && shouldUpdateIcon) {
        icon.classList.remove('icon-heart');
        icon.classList.add('icon-trash');
      }
      // Update text/tooltip if present
      const tooltip = this.querySelector('.tooltip');
      const text = this.querySelector('.text');
      if (tooltip) tooltip.textContent = 'Remove';
      if (text) text.textContent = 'Remove';
    } else {
      this.classList.remove('active');
      if (icon && shouldUpdateIcon) {
        icon.classList.remove('icon-trash');
        icon.classList.add('icon-heart');
      }
      // Update text/tooltip if present
      const tooltip = this.querySelector('.tooltip');
      const text = this.querySelector('.text');
      if (tooltip) tooltip.textContent = 'Add to Wishlist';
      if (text) text.textContent = 'Add to List';
    }
  }

  onClick(e) {
    e.preventDefault();
    this.setLoading(true);
    const handle = this.productHandle;
    if (!handle) return;

    let items = this.getStorageItems(this.STORAGE_KEY);
    const wasInWishlist = items.includes(handle);
    let action = 'add';

    if (wasInWishlist) {
      items = items.filter(h => h !== handle);
      action = 'remove';
    } else {
      items.push(handle);
      action = 'add';
    }

    this.setStorageItems(this.STORAGE_KEY, items);

    // Update state immediately for better UX
    this.updateState();

    setTimeout(() => {
      if (!this.isConnected) return;
      this.setLoading(false);
      this.dispatchUpdate({ items, action, handle });
    }, 150);
  }
}
customElements.define('wishlist-toggle', WishlistToggle);

export default WishlistToggle