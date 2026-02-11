import BaseStorageElement from '../helpers/base-storage.js'
class CompareRemove extends BaseStorageElement {
  constructor() {
    super();
    this.STORAGE_KEY = 'compare-list';
    this.EVENT_NAME = 'compare:updated';
    this.removeProduct = this.removeProduct.bind(this);
  }

  connectedCallback() {
    this.addEventListener('click', this.removeProduct);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.removeProduct);
  }

  removeProduct(e) {
    e.preventDefault();
    const handle = this.dataset.handle;
    if (!handle) return;
    
    this.setLoading(true);

    const currentList = this.getStorageItems(this.STORAGE_KEY);
    const index = currentList.indexOf(handle);
    
    if (index > -1) {
      currentList.splice(index, 1);
      this.setStorageItems(this.STORAGE_KEY, currentList);
      this.dispatchUpdate({ list: currentList });
    }
  }
}
customElements.define('compare-remove', CompareRemove);

export default CompareRemove