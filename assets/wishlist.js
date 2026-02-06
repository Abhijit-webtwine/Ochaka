class WishlistToggle extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick);
    window.addEventListener('wishlist:updated', this.onUpdate);
    this.updateState();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    window.removeEventListener('wishlist:updated', this.onUpdate);
  }

  onUpdate(e) {
    this.updateState(e.detail?.items);
  }

  updateState(items = null) {
    const handle = this.dataset.productHandle;
    if (!handle) return;

    if (!items) {
      const key = 'wishlist-items';
      items = JSON.parse(sessionStorage.getItem(key) || '[]');
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
      if (tooltip) tooltip.textContent = 'Remove from Wishlist';
      if (text) text.textContent = 'Remove from List';
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
    this.classList.add('loading');
    const handle = this.dataset.productHandle;
    if (!handle) return;

    const key = 'wishlist-items';
    let items = JSON.parse(sessionStorage.getItem(key) || '[]');
    const wasInWishlist = items.includes(handle);
    let action = 'add';

    if (wasInWishlist) {
      items = items.filter(h => h !== handle);
      action = 'remove';
    } else {
      items.push(handle);
      action = 'add';
    }

    sessionStorage.setItem(key, JSON.stringify(items));

    // Update state immediately for better UX
    this.updateState();

    setTimeout(() => {
      if (!this.isConnected) return;
      this.classList.remove('loading');

      window.dispatchEvent(
        new CustomEvent('wishlist:updated', { detail: { items, action, handle } })
      );
    }, 150);
  }
}

customElements.define('wishlist-toggle', WishlistToggle);

class WishlistView extends HTMLElement {
  constructor() {
    super();
    this.onUpdate = this.onUpdate.bind(this);
    this._hasRenderedOnce = false;
    // Cache array to store { html, url } objects
    this.filterData = [];
    this.currentPage = 1;
    this.itemsPerPage = 12; // Matches liquid pagination
    this.abortController = null;
  }

  connectedCallback() {
    // Check for page param in initial URL
    const urlParams = new URLSearchParams(window.location.search);
    this.currentPage = parseInt(urlParams.get('page')) || 1;

    // Always fetch on page load - don't scroll
    this.fetchFromSession(this.currentPage);

    // Listen for updates
    window.addEventListener('wishlist:updated', this.onUpdate);
    
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
    window.removeEventListener('wishlist:updated', this.onUpdate);
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
    const items = JSON.parse(sessionStorage.getItem('wishlist-items') || '[]');
    this.fetchWishlist(items, this.currentPage);
  }

  fetchWishlist(items, page = 1, showLoader = true) {
    // prevent duplicate fetch on initial render
    if (this._hasRenderedOnce && !items.length) {
      this.innerHTML = `<div class="tf-wishlist-empty text-center">
        <p class="text-notice">NO PRODUCTS WERE ADDED TO THE WISHLIST.</p>
        <a href="/collections/all" class="tf-btn animate-btn btn-fill btn-back-shop">BACK TO SHOPPING</a>
        </div>`;
      return;
    }

    if (!items.length) {
      this.innerHTML = `<div class="tf-wishlist-empty text-center">
        <p class="text-notice">NO PRODUCTS WERE ADDED TO THE WISHLIST.</p>
        <a href="/collections/all" class="tf-btn animate-btn btn-fill btn-back-shop">BACK TO SHOPPING</a>
        </div>`;
      this._hasRenderedOnce = true;
      return;
    }

    const handles = [...items].reverse();
    const query = handles.map(h => `handle:${h}`).join(' OR ');
    
    const url = `/search?view=wishlist&q=${encodeURIComponent(query)}&page=${page}`;

    if (showLoader) {
      this.classList.add('loading');
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
            this.classList.remove('loading');
        }
    });
  }

  postRender() {
    this.classList.remove('loading');
  }
}

customElements.define('wishlist-view', WishlistView);
