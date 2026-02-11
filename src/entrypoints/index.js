import initFaqSidebar from '../js/components/faq-sidebar.js'
import initFaqSearch from '../js/components/faq-search.js'
import WishlistToggle from '../js/components/wishlist-toggle.js'
import WishlistView from '../js/components/wishlist-view.js'
import WishlistCount from '../js/components/wishlist-count.js'
import CompareView from '../js/components/compare-view.js'
import CompareToggle from '../js/components/compare-toggle.js'
import CompareRemove from '../js/components/compare-remove.js'
import CompareClear from '../js/components/compare-clear.js'
import CompareCount from '../js/components/compare-count.js'
import QuickView from '../js/components/quick-view.js'
import GlobalPagination from '../js/components/global-pagination.js'

function onPageLoad () {
  initFaqSidebar()
  initFaqSearch()
  new WishlistToggle()
  new WishlistView()
  new WishlistCount()
  new CompareView()
  new CompareToggle()
  new CompareRemove()
  new CompareClear()
  new CompareCount()
  new QuickView()
  new GlobalPagination();
}

onPageLoad()

