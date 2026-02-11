import BaseStorageElement from '../helpers/base-storage.js'

class CompareClear extends BaseStorageElement {
  constructor() {
    super();
    this.addEventListener('click', this.clearCompare.bind(this));
    this.STORAGE_KEY = 'compare-list';
    this.EVENT_NAME = 'compare:updated';
  }

  clearCompare(e) {
    e.preventDefault();
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.dispatchUpdate({ list: [] });
  }
}
customElements.define('compare-clear', CompareClear);

export default CompareClear