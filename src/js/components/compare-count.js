import BaseCountElement from '../helpers/base-count.js'

class CompareCount extends BaseCountElement {
  constructor() {
    super();
    this.STORAGE_KEY = 'compare-list';
    this.EVENT_NAME = 'compare:updated';
  }
}
customElements.define('compare-count', CompareCount);

export default CompareCount