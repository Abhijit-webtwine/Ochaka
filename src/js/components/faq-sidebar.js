export default function initFaqSidebar() {
  const sidebarLists = document.querySelectorAll(".js-sidebar-categories");
  const categories = document.querySelectorAll(".faq-item");

  if (sidebarLists.length === 0 || categories.length === 0) return;

  const processedTitles = new Set();

  // 1. Generate HTML string once
  const sidebarHtml = Array.from(categories)
    .filter(cat => {
      const title = cat.getAttribute("data-title");
      const id = cat.getAttribute("id");
      if (!id || !title || processedTitles.has(title)) return false;
      processedTitles.add(title);
      return true;
    })
    .map(cat => `
      <li>
        <a href="#${cat.id}" class="h6 link js-faq-sidebar-link">
          ${cat.getAttribute("data-title")}
        </a>
      </li>
    `)
    .join('');

  // 2. Update all lists
  sidebarLists.forEach(list => {
    list.innerHTML = sidebarHtml;

    // Handle offcanvas dismissal for mobile
    list.addEventListener('click', (e) => {
      const link = e.target.closest('.js-faq-sidebar-link');
      if (!link) return;

      const offcanvas = link.closest('.offcanvas');
      if (offcanvas && window.bootstrap?.Offcanvas) {
        window.bootstrap.Offcanvas.getInstance(offcanvas)?.hide();
      }
    });
  });
}