import BaseCountElement from '../helpers/base-count.js'
class WishlistCount extends BaseCountElement {
  constructor() {
    super();
    this.STORAGE_KEY = 'wishlist-items';
    this.EVENT_NAME = 'wishlist:updated';
  }
}
customElements.define('wishlist-count', WishlistCount);
export default WishlistCount