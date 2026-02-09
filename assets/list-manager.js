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

class WishlistCount extends BaseCountElement {
  constructor() {
    super();
    this.STORAGE_KEY = 'wishlist-items';
    this.EVENT_NAME = 'wishlist:updated';
  }
}
customElements.define('wishlist-count', WishlistCount);


// Compare 
if (!customElements.get('compare-toggle')) {
  class CompareToggle extends BaseStorageElement {
    constructor() {
      super();
      this.STORAGE_KEY = 'compare-list';
      this.EVENT_NAME = 'compare:updated';
    }

    connectedCallback() {
      this.addEventListener('click', this.toggleCompare.bind(this));
      this.setupEventListeners();
      this.updateState();
    }

    disconnectedCallback() {
      this.removeEventListeners();
    }

    toggleCompare(e) {
      e.preventDefault();

      const currentList = this.getStorageItems(this.STORAGE_KEY);
      const index = currentList.indexOf(this.productHandle);

      if (index > -1) {
        // Already in list. Just open modal.
        this.openModal();
        return;
      }

      this.setLoading(true);
      currentList.push(this.productHandle);

      this.setStorageItems(this.STORAGE_KEY, currentList);
      this.updateState();

      // Wait for compare:loaded event
      const onLoaded = () => {
        this.openModal();
        this.setLoading(false);
        window.removeEventListener('compare:loaded', onLoaded);
      };
      window.addEventListener('compare:loaded', onLoaded);

      this.dispatchUpdate({ list: currentList });
    }

    openModal() {
      const modal = document.getElementById('compare');
      if (modal && window.bootstrap) {
        const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(modal);
        offcanvas.show();
      }
    }


    updateState(currentList) {
      if (!currentList) {
        currentList = this.getStorageItems(this.STORAGE_KEY);
      }
      const isActive = currentList.includes(this.productHandle);

      this.classList.toggle('active', isActive);

      const textSpan = this.querySelector('.text');
      if (textSpan) {
        textSpan.textContent = isActive ? 'Added' : 'Add to Compare';
      }

      // Update tooltip if exists
      const tooltip = this.querySelector('.tooltip');
      if (tooltip) {
        tooltip.textContent = isActive ? 'Added' : 'Compare';
      }
    }
  }
  customElements.define('compare-toggle', CompareToggle);
}

if (!customElements.get('compare-view')) {
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
}

if (!customElements.get('compare-clear')) {
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
}

if (!customElements.get('compare-count')) {
  class CompareCount extends BaseCountElement {
    constructor() {
      super();
      this.STORAGE_KEY = 'compare-list';
      this.EVENT_NAME = 'compare:updated';
    }
  }
  customElements.define('compare-count', CompareCount);
}

if (!customElements.get('compare-remove')) {
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
}

