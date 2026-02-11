export default function initFaqSidebar() {
  const sidebarList = document.querySelector(".js-sidebar-categories");
  const categories = document.querySelectorAll(".faq-item");

  if (!sidebarList || categories.length === 0) return;

  categories.forEach((category) => {
    const title = category.getAttribute("data-title") || "Category";
    const id = category.getAttribute("id");

    if (!id) return;

    const li = document.createElement("li");
    const a = document.createElement("a");

    a.href = `#${id}`;
    a.className = "h6 link";
    a.textContent = title;

    li.appendChild(a);
    sidebarList.appendChild(li);
  });
}