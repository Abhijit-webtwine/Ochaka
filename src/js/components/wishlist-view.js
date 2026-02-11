import BaseStorageElement from '../helpers/base-storage.js'

class WishlistView extends BaseStorageElement {
  constructor() {
    super();
    this._hasRenderedOnce = false;
    // Cache array to store { html, url } objects
    this.filterData = [];
    this.currentPage = 1;
    this.itemsPerPage = 12; // Matches liquid pagination
    this.abortController = null;
    this.STORAGE_KEY = 'wishlist-items';
    this.EVENT_NAME = 'wishlist:updated';
  }

  connectedCallback() {
    // Check for page param in initial URL
    const urlParams = new URLSearchParams(window.location.search);
    this.currentPage = parseInt(urlParams.get('page')) || 1;

    // Always fetch on page load - don't scroll
    this.fetchFromSession(this.currentPage);

    this.setupEventListeners();

    // Listen for pagination clicks
    this.addEventListener('click', this.handlePaginationClick.bind(this));

    // Listen for browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.fetchFromSession(e.state.page);
      }
    });
  }

  disconnectedCallback() {
    this.removeEventListeners();
    this.removeEventListener('click', this.handlePaginationClick.bind(this));
  }

  handlePaginationClick(e) {
    const link = e.target.closest('.pagination-item');
    if (!link || !link.href) return;

    e.preventDefault();

    const url = new URL(link.href, window.location.origin);
    const page = parseInt(url.searchParams.get('page')) || 1;

    this.fetchFromSession(page);
  }

  updateURL(page) {
    if (page === this.currentPage) {
      // Just replace state if we are just updating the same page view
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      history.replaceState({ page }, '', url);
    } else {
      // Push state for new page
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      history.pushState({ page }, '', url);
    }
    this.currentPage = page;
  }

  onUpdate(e) {
    const detail = e.detail || {};
    const items = detail.items || [];
    const action = detail.action;
    const handle = detail.handle;

    // Clear cache when wishlist items update because content changes
    this.filterData = [];

    // Calculate total pages based on new items count
    const totalPages = Math.ceil(items.length / this.itemsPerPage);

    // If current page is beyond total pages (e.g. removed last item on page 2), go to last available page
    // But if items is empty (0), page 1 is fine (empty state)
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }

    // Visual feedback for removal without layout shift
    if (action === 'remove' && handle) {
      const toggle = this.querySelector(`wishlist-toggle[data-product-handle="${handle}"]`);
      if (toggle) {
        const card = toggle.closest('.card-product');
        if (card) {
          card.classList.add('removing');
        }
      }
    }

    // Fetch the updated list to fill gaps from other pages - don't scroll, keep loader active
    const showLoader = true;
    this.fetchWishlist(items, this.currentPage, showLoader);
  }

  fetchFromSession(page = 1) {
    this.currentPage = parseInt(page);
    this.updateURL(this.currentPage);
    const items = this.getStorageItems(this.STORAGE_KEY);
    this.fetchWishlist(items, this.currentPage);
  }

  fetchWishlist(items, page = 1, showLoader = true) {
    // prevent duplicate fetch on initial render
    const emptyHtml = `<div class="tf-wishlist-empty text-center">
        <p class="text-notice">NO PRODUCTS WERE ADDED TO THE WISHLIST.</p>
        <a href="/collections/all" class="tf-btn animate-btn btn-fill btn-back-shop">BACK TO SHOPPING</a>
        </div>`;

    if (this._hasRenderedOnce && !items.length) {
      this.renderEmpty(emptyHtml);
      return;
    }

    if (!items.length) {
      this.renderEmpty(emptyHtml);
      this._hasRenderedOnce = true;
      return;
    }

    const handles = [...items].reverse();
    const query = handles.map(h => `handle:${h}`).join(' OR ');

    const url = `/search?view=wishlist&q=${encodeURIComponent(query)}&page=${page}`;

    if (showLoader) {
      this.setLoading(true);
    }

    // Abort previous fetch request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Check cache first
    const cachedData = this.filterData.find(entry => entry.url === url);

    if (cachedData) {
      this.renderFromCache(cachedData);
    } else {
      this.renderFromFetch(url, signal);
    }
  }

  renderFromCache(cachedData) {
    this.innerHTML = cachedData.html;
    this._hasRenderedOnce = true;
    this.postRender();
  }

  renderFromFetch(url, signal) {
    fetch(url, { signal })
      .then(r => r.text())
      .then(html => {
        // Add to cache
        this.filterData.push({ html, url });

        this.innerHTML = html;
        this._hasRenderedOnce = true;
        this.postRender();
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Wishlist fetch failed', err);
      })
      .finally(() => {
        // Only remove loading if this is the current controller
        if (this.abortController.signal === signal) {
          this.setLoading(false);
        }
      });
  }

  postRender() {
    this.setLoading(false);
  }
}
customElements.define('wishlist-view', WishlistView);

export default WishlistView