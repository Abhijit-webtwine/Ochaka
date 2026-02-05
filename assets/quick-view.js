class QuickView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', this.loadQuickView.bind(this));
  }

  loadQuickView() {
    const productUrl = this.dataset.productUrl.split('?')[0];
    const sectionUrl = `${productUrl}?section_id=quick-view`;
    const cacheKey = sectionUrl;

    const cachedData = QuickView.cache.find(entry => entry.url === cacheKey);

    if (cachedData) {
      this.renderSectionFromCache(cachedData);
    } else {
      this.renderSectionFromFetch(sectionUrl);
    }
  }

  renderSectionFromFetch(url) {
    this.classList.add('loading');
    fetch(url)
      .then(response => response.text())
      .then(responseText => {
        const parsed = new DOMParser().parseFromString(responseText, 'text/html');
        QuickView.cache.push({ url, html: parsed });
        this.renderQuickView(parsed);
      })
      .catch(e => {
        console.error(e);
      })
      .finally(() => {
        this.classList.remove('loading');
      });
  }

  renderSectionFromCache(cachedData) {
    this.renderQuickView(cachedData.html);
  }

  renderQuickView(html) {
    const selector = '.quick-view__content';
    const drawerContent = document.querySelector('#quickView .modal-content');
    drawerContent.innerHTML = '';

    const productElement = html.querySelector(selector);

    if (productElement) {
      this.setInnerHTML(drawerContent, productElement.innerHTML);

      if (window.Shopify && Shopify.PaymentButton) {
        Shopify.PaymentButton.init();
      }

      const quickViewModal = document.getElementById('quickView');
      const modal = bootstrap.Modal.getOrCreateInstance(quickViewModal);
      modal.show();

      this.initCarousel(drawerContent);

      drawerContent.classList.add('hide-cover');

      const productForm = drawerContent.querySelector('product-form');
      if (productForm) {
        productForm.addEventListener('productForm:added', () => {
          if (modal) modal.hide();
        });
      }

      document.dispatchEvent(new CustomEvent('quickview:loaded', {
        detail: {
          productUrl: this.dataset.productUrl
        }
      }));
    }
  }

  setInnerHTML(element, html) {
    element.innerHTML = html;
  }

  initCarousel(element) {
    const $element = $(element);
    const $modalRoot = $element.find('.modal-quick-view').length ? $element.find('.modal-quick-view') : $element;
    
    if ($modalRoot.find(".tf-single-slide").length === 0) return;

    if ($modalRoot.data('swiper-qv')) {
        $modalRoot.data('swiper-qv').destroy(true, true);
    }

    var mainQV = new Swiper($modalRoot.find(".tf-single-slide")[0], {
        slidesPerView: 1,
        spaceBetween: 0,
        observer: true,
        observeParents: true,
        speed: 800,
        navigation: {
            nextEl: $modalRoot.find(".single-slide-next")[0],
            prevEl: $modalRoot.find(".single-slide-prev")[0],
        },
    });
    
    $modalRoot.data('swiper-qv', mainQV);
  }
}

QuickView.cache = [];
customElements.define('quick-view', QuickView);
