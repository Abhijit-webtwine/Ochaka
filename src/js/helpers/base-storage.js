class BaseStorageElement extends HTMLElement {
  constructor() {
    super();
    this.onUpdate = this.onUpdate.bind(this);
  }

  get productHandle() {
    return this.dataset.productHandle;
  }

  getStorageItems(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  setStorageItems(key, items) {
    sessionStorage.setItem(key, JSON.stringify(items));
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.classList.add('loading');
    } else {
      this.classList.remove('loading');
    }
  }

  setupEventListeners() {
    if (this.EVENT_NAME) {
      window.addEventListener(this.EVENT_NAME, this.onUpdate);
    }
  }

  removeEventListeners() {
    if (this.EVENT_NAME) {
      window.removeEventListener(this.EVENT_NAME, this.onUpdate);
    }
  }

  dispatchUpdate(detail) {
    if (this.EVENT_NAME) {
      window.dispatchEvent(new CustomEvent(this.EVENT_NAME, { detail }));
    }
  }

  onUpdate(e) {
    // Default implementation can be overridden
    if (this.updateState) {
      const items = e.detail?.items || e.detail?.list;
      this.updateState(items);
    }
  }

  renderEmpty(html) {
    this.innerHTML = html;
    this.setLoading(false);
  }
}
export default BaseStorageElement