import BaseStorageElement from '../helpers/base-storage.js'

class CompareView extends BaseStorageElement {
  constructor() {
    super();
    this.STORAGE_KEY = 'compare-list';
    this.EVENT_NAME = 'compare:updated';
  }

  connectedCallback() {
    this.loadCompare();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  onUpdate() {
    this.loadCompare();
  }

  loadCompare() {
    const handles = this.getStorageItems(this.STORAGE_KEY);
    const view = this.dataset.view || 'compare';

    if (handles.length === 0) {
      if (view === 'compare') {
        this.renderEmpty('<div class="tf-compare-empty text-center"><p class="text-notice">NO ITEMS IN COMPARE LIST</p><a href="/collections/all" class="tf-btn animate-btn btn-fill btn-back-shop">BACK TO SHOPPING</a></div>');
      } else {
          this.renderEmpty('<p class="box-text_empty h6 text-main">Your Compare is currently empty</p>');
      }
      return;
    }

    this.setLoading(true);
    const sortBy = handles.join(',');
    const url = `/collections/all?view=${view}&sort_by=${sortBy}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        this.innerHTML = html;
        // Dispatch loaded event
        window.dispatchEvent(new CustomEvent('compare:loaded'));
      })
      .catch((err) => {
        console.error('Error fetching compare list:', err);
        this.innerHTML = '<div class="text-center">Error loading compare list.</div>';
        // Still dispatch loaded so modal can open (with error message)
        window.dispatchEvent(new CustomEvent('compare:loaded'));
      })
      .finally(() => {
        this.setLoading(false);
      });
  }
}
customElements.define('compare-view', CompareView);

export default CompareView