class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    if (facetForm) {
      facetForm.addEventListener('input', (event) => {
        if (window.innerWidth < 1200 || facetForm.id === 'FacetFiltersFormMobile') {
          return;
        }
        this.debouncedOnSubmit(event);
      });
    }

    this.addEventListener('click', (event) => {
      const applyBtn = event.target.closest('.btn-apply-filter');
      if (applyBtn && !this.closest('facet-drawer')) {
        event.preventDefault();
        this.onSubmitHandler(event);
        document.querySelectorAll('.sidebar-filter,.overlay-filter').forEach((el) => el.classList.remove('show'));
      }
    });

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  connectedCallback() {
    this.initializeSorting();
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden'));
    const gridContainer = document.getElementById('ProductGridContainer');
    if (gridContainer) gridContainer.classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      })
      .catch((error) => {
        console.error('Error fetching filter data:', error);
      })
      .finally(() => {
        document.getElementById('ProductGridContainer')?.classList.remove('loading');
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    try {
      const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
      FacetFiltersForm.renderFilters(html, event);
      FacetFiltersForm.renderProductGridContainer(html);
      FacetFiltersForm.renderProductCount(html);
      if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
    } catch (error) {
      console.error('Error rendering cached filter data:', error);
    } finally {
      document.getElementById('ProductGridContainer')?.classList.remove('loading');
    }
  }

  static renderProductGridContainer(html) {
    const previousLayoutState = FacetFiltersForm.getCurrentLayoutState();
    const container = document.getElementById('ProductGridContainer');
    const newContainer = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer');

    if (container && newContainer) {
      container.innerHTML = newContainer.innerHTML;
      container.querySelectorAll('.scroll-trigger').forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
    }

    FacetFiltersForm.applyLayoutState(previousLayoutState);

    // Re-initialize price slider after filter update
    if (typeof window.reinitPriceSlider === 'function') {
      window.reinitPriceSlider();
    }
  }

  static getCurrentLayoutState() {
    const activeSwitch = document.querySelector('.tf-view-layout-switch.active');
    const activeValue = activeSwitch ? activeSwitch.getAttribute('data-value-layout') : null;

    const isList = activeValue === 'list' || Boolean(document.querySelector('.sw-layout-list.active'));

    let gridClass = null;
    const gridLayoutEl = document.getElementById('gridLayout');
    if (gridLayoutEl) {
      const classes = Array.from(gridLayoutEl.classList);
      gridClass = classes.find((c) => /^tf-col-\d+$/.test(c)) || null;
    }

    return {
      isList,
      activeValue,
      gridClass,
    };
  }

  static applyLayoutState(layoutState) {
    if (!layoutState) return;

    const gridLayoutEl = document.getElementById('gridLayout');
    const listLayoutEl = document.getElementById('listLayout');
    const wrapperControl = document.querySelector('.wrapper-control-shop');

    if (!gridLayoutEl || !listLayoutEl) return;

    if (layoutState.isList) {
      gridLayoutEl.style.display = 'none';
      listLayoutEl.style.display = '';

      if (wrapperControl) {
        wrapperControl.classList.add('listLayout-wrapper');
        wrapperControl.classList.remove('gridLayout-wrapper');
      }

      document.querySelectorAll('.tf-view-layout-switch').forEach((el) => el.classList.remove('active'));
      const listSwitch = document.querySelector('.tf-view-layout-switch[data-value-layout="list"]');
      if (listSwitch) listSwitch.classList.add('active');
      return;
    }

    // Grid layout
    listLayoutEl.style.display = 'none';
    gridLayoutEl.style.display = '';

    if (layoutState.gridClass) {
      gridLayoutEl.className = `wrapper-shop tf-grid-layout ${layoutState.gridClass}`;
    }

    if (wrapperControl) {
      wrapperControl.classList.add('gridLayout-wrapper');
      wrapperControl.classList.remove('listLayout-wrapper');
    }

    document.querySelectorAll('.tf-view-layout-switch').forEach((el) => el.classList.remove('active'));
    const targetGridSwitch = layoutState.gridClass
      ? document.querySelector(`.tf-view-layout-switch[data-value-layout="${layoutState.gridClass}"]`)
      : document.querySelector('.tf-view-layout-switch[data-value-layout]:not([data-value-layout="list"])');
    if (targetGridSwitch) targetGridSwitch.classList.add('active');
  }

  static renderProductCount(html) {
    const countEl = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
    if (countEl) {
      const count = countEl.innerHTML;
      const container = document.getElementById('ProductCount');
      const containerDesktop = document.getElementById('ProductCountDesktop');
      if (container) {
        container.innerHTML = count;
        container.classList.remove('loading');
      }
      if (containerDesktop) {
        containerDesktop.innerHTML = count;
        containerDesktop.classList.remove('loading');
      }
    }
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.add('hidden'));
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const facetDetailsElementsFromDom = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    // Remove facets that are no longer returned from the server
    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    const matchesId = (element) => {
      const jsFilter = event && event.target ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.id === jsFilter.id : false;
    };

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      // Element already rendered in the DOM so just update the innerHTML
      if (currentElement) {
        document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          // Same facet type (eg horizontal/vertical or drawer/mobile)
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
            return;
          }
        }

        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    // Re-initialize price slider after filter update
    if (typeof window.reinitPriceSlider === 'function') {
      window.reinitPriceSlider();
    }

    if (countsToRender && event && event.target) {
      const closestFilter = event.target.closest('.js-filter');
      const closestJSFilterID = closestFilter ? closestFilter.id : null;

      if (closestJSFilterID) {
        FacetFiltersForm.renderCounts(countsToRender, closestFilter);

        const newFacetDetailsElement = document.getElementById(closestJSFilterID);
        if (newFacetDetailsElement) {
          const newElementSelector = newFacetDetailsElement.classList.contains('mobile-facets__details')
            ? `.mobile-facets__close-button`
            : `.facets__summary`;
          const newElementToActivate = newFacetDetailsElement.querySelector(newElementSelector);
          const isTextInput = event.target.getAttribute('type') === 'text';

          if (newElementToActivate && !isTextInput) newElementToActivate.focus();
        }
      }
    }
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      const targetElement = document.querySelector(selector);
      if (activeFacetsElement && targetElement) {
        targetElement.innerHTML = activeFacetsElement.innerHTML;
      }
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      const sourceEl = html.querySelector(selector);
      const targetEl = document.querySelector(selector);
      if (sourceEl && targetEl) {
        targetEl.innerHTML = sourceEl.innerHTML;
      }
    });
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement) {
      targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
    }

    const targetWrapElement = target.querySelector('.facets-wrap');
    const sourceWrapElement = source.querySelector('.facets-wrap');

    if (sourceWrapElement && targetWrapElement) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrapElement
          .querySelectorAll('.facets__item.hidden')
          .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
      }

      targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    const grid = document.getElementById('product-grid');
    return [
      {
        section: grid ? grid.dataset.id : (document.querySelector('[data-id]')?.dataset?.id || ''),
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  /**
   * Initialize sorting functionality
   * Sets up event listeners for sort dropdown items
   */
  initializeSorting() {
    const sortItems = this.querySelectorAll('.select-item[data-sort-value]');
    sortItems.forEach(item => {
      item.addEventListener('click', this.handleSortChange);
    });
  }

  /**
   * Handle sort selection change
   */
  handleSortChange(event) {
    event.preventDefault();
    
    const sortValue = event.currentTarget.dataset.sortValue;
    const form = this.closest('facet-filters-form').querySelector('form');
    const sortInput = form.querySelector('input[name="sort_by"]');
    
    if (sortInput && sortInput.value !== sortValue) {
      // Update the hidden input value
      sortInput.value = sortValue;
      
      // Show loading state
      this.showLoadingState();
      
      // Get all current active filters from the URL
      const currentUrl = new URL(window.location);
      const currentFilters = {};
      
      // Preserve all existing URL parameters except the ones we're about to update
      currentUrl.searchParams.forEach((value, key) => {
        if (key !== 'sort_by') {  // We'll update sort_by separately
          currentFilters[key] = value;
        }
      });
      
      // Update the URL with both existing filters and new sort value
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('sort_by', sortValue);
      
      // Re-apply all existing filters to the new URL
      Object.entries(currentFilters).forEach(([key, value]) => {
        newUrl.searchParams.set(key, value);
      });
      
      // Update URL without page reload
      window.history.pushState({ path: newUrl.toString() }, '', newUrl);
      
      // Prepare form data with all current filters
      const formData = new FormData(form);
      
      // Add all current filters to the form data
      Object.entries(currentFilters).forEach(([key, value]) => {
        // Special handling for array-like parameters (like filter.v.option.size)
        if (key.includes('filter.v.option.')) {
          formData.append(key, value);
        } else {
          formData.set(key, value);
        }
      });
      
      // Submit the form with all filters and new sort value
      const searchParams = new URLSearchParams(formData).toString();
      this.onSubmitForm(searchParams, event);
    }
  }

  /**
   * Show loading state when sorting changes
   */
  showLoadingState() {
    const productGrid = document.getElementById('ProductGridContainer');
    if (productGrid) {
      productGrid.classList.add('loading');
    }
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement && event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const formEl = event.target ? event.target.closest('form') : this.querySelector('form');
      const isMobile = formEl && formEl.id === 'FacetFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  connectedCallback() {
    this.slider = this.querySelector('#price-value-range');
    if (!this.slider) return;

    if (this.slider.noUiSlider) {
      this.slider.noUiSlider.destroy();
    }

    this.inputs = this.querySelectorAll('input');
    if (this.inputs.length < 2) return;

    this.minInput = this.inputs[0];
    this.maxInput = this.inputs[1];
    this.skipValues = [this.querySelector("#price-min-value"), this.querySelector("#price-max-value")];

    this.initSlider();
  }

  initSlider() {
    const min = Number(this.slider.dataset.min);
    const max = Number(this.slider.dataset.max);

    const startMin = this.minInput.value !== '' ? Number(this.minInput.value) : min;
    const startMax = this.maxInput.value !== '' ? Number(this.maxInput.value) : max;

    noUiSlider.create(this.slider, {
      start: [startMin, startMax],
      connect: true,
      step: 1,
      range: { min, max }
    });

    // Slider → Input
    this.slider.noUiSlider.on('update', (values) => {
      this.minInput.value = Math.round(values[0]);
      this.maxInput.value = Math.round(values[1]);
      if (this.skipValues[0]) this.skipValues[0].innerText = Math.round(values[0]);
      if (this.skipValues[1]) this.skipValues[1].innerText = Math.round(values[1]);
    });

    // Slider → Filter
    this.slider.noUiSlider.on('change', () => {
      this.minInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.maxInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Trigger input if your JS listens on input events
      const form = this.slider.closest('form');
      if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Input → Slider
    this.minInput.addEventListener('change', () => this.slider.noUiSlider.set([this.minInput.value, null]));
    this.maxInput.addEventListener('change', () => this.slider.noUiSlider.set([null, this.maxInput.value]));
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    if (facetLink) {
      facetLink.setAttribute('role', 'button');
      facetLink.addEventListener('click', this.closeFilter.bind(this));
      facetLink.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
      });
    }
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    if (form) form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);
