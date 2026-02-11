/**
 * Global Pagination Handler
 * Handles AJAX pagination for Collections, Search, Wishlist, and Blogs.
 */

class GlobalPagination {
  constructor() {
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('click', this.handlePaginationClick.bind(this));
    window.addEventListener('popstate', (event) => this.handlePopState(event));
  }

  handlePaginationClick(event) {
    const link = event.target.closest('.wg-pagination a, .pagination-item, .pagination-item a');
    if (!link) return;

    // Allow cmd/ctrl click
    if (event.metaKey || event.ctrlKey || event.button === 1) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' || href === '') return;

    // Detect context using closest() for better performance
    const blogContainer = link.closest('#BlogGridContainer');
    const collectionContainer = link.closest('#ProductGridContainer');
    const wishlistContainer = link.closest('wishlist-view');

    if (blogContainer) {
      this.handleBlogPagination(event, href, blogContainer);
    } else if (collectionContainer) {
      this.handleCollectionPagination(event, href, collectionContainer);
    } else if (wishlistContainer) {
      this.handleWishlistPagination(event, href, wishlistContainer);
    }
  }

  handlePopState(event) {
    if (event.state && event.state.path) {
      window.location.href = event.state.path;
    }
  }

  getSearchParams(href) {
    try {
      const url = new URL(href, window.location.origin);
      return url.searchParams.toString();
    } catch (e) {
      return '';
    }
  }

  handleCollectionPagination(event, href, container) {
    event.preventDefault();
    const searchParams = this.getSearchParams(href);
    
    if (typeof FacetFiltersForm !== 'undefined' && FacetFiltersForm.renderPage) {
      FacetFiltersForm.renderPage(searchParams, event);
    } else {
      this.fetchSection(href, container, '#ProductGridContainer');
    }
  }

  handleWishlistPagination(event, href, container) {
    event.preventDefault();
    const url = new URL(href, window.location.origin);
    const page = parseInt(url.searchParams.get('page')) || 1;
    
    if (container && typeof container.fetchFromSession === 'function') {
      container.fetchFromSession(page);
    }
  }

  handleBlogPagination(event, href, container) {
    event.preventDefault();
    this.fetchSection(href, container, '#BlogGridContainer');
  }

  /**
   * Optimized fetch section method using async/await
   */
  async fetchSection(href, container, selector) {
    if (!container) return;
    
    container.classList.add('loading');
    const sectionId = container.dataset.id || container.id;
    
    try {
      const url = new URL(href, window.location.origin);
      url.searchParams.set('section_id', sectionId);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newContent = doc.querySelector(selector);
      
      if (newContent) {
        container.innerHTML = newContent.innerHTML;
        window.history.pushState({ path: href }, '', href);
        container.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = href;
      }
    } catch (error) {
      console.error('Pagination optimization fetch failed:', error);
      window.location.href = href;
    } finally {
      container.classList.remove('loading');
    }
  }
}
export default GlobalPagination;
