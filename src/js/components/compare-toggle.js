import BaseStorageElement from '../helpers/base-storage.js'

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

export default CompareToggle