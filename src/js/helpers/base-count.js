import BaseStorageElement from './base-storage.js'

class BaseCountElement extends BaseStorageElement {
  connectedCallback() {
    this.updateState();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  updateState(items) {
    if (!items) {
      items = this.getStorageItems(this.STORAGE_KEY);
    }
    const count = items.length;

    const countElement = this.querySelector('[aria-hidden="true"]');
    if (countElement) {
      countElement.textContent = count;
    } else {
      this.textContent = count;
    }

    if (count > 0) {
      this.classList.remove('d-none');
    } else {
      this.classList.add('d-none');
    }
  }
}
export default BaseCountElement