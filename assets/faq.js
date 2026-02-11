document.addEventListener("DOMContentLoaded", function () {
  // Populate Sidebar Categories
  const sidebarList = document.querySelector(".js-sidebar-categories");
  const categories = document.querySelectorAll(".faq-item");

  if (sidebarList && categories.length > 0) {
    categories.forEach((category) => {
      const title = category.getAttribute("data-title") || "Category";
      const id = category.getAttribute("id");

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + id;
      a.className = "h6 link";
      a.textContent = title;

      li.appendChild(a);
      sidebarList.appendChild(li);
    });
  }

  const searchInput = document.querySelector(".js-faq-search-input");
  const faqItems = document.querySelectorAll(".accordion-faq");
  const sidebarLinks = document.querySelectorAll(".sb-category li");

  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const query = e.target.value.toLowerCase().trim();

      if (query === "") {
        // Show everything if search is empty
        faqItems.forEach((item) => item.classList.remove("d-none"));
        categories.forEach((cat) => cat.classList.remove("d-none"));
        return;
      }

      categories.forEach((category) => {
        const categoryQuestions = category.querySelectorAll(".accordion-faq");
        const categoryTitle = category.querySelector(".faq_title");
        let categoryHasMatch = false;

        categoryQuestions.forEach((item) => {
          const questionText = item
            .querySelector(".accordion-title")
            .textContent.toLowerCase();
          const answerText = item
            .querySelector(".accordion-body")
            .textContent.toLowerCase();

          if (questionText.includes(query) || answerText.includes(query)) {
            item.classList.remove("d-none");
            categoryHasMatch = true;
          } else {
            item.classList.add("d-none");
          }
        });

        // Show/Hide the whole category block based on if it has matching questions
        // Also check if the category title itself matches the search
        const categoryTitleText = categoryTitle
          ? categoryTitle.textContent.toLowerCase()
          : "";

        if (categoryHasMatch || categoryTitleText.includes(query)) {
          category.classList.remove("d-none");
          // If category title matches but no questions match yet, show all questions in that category
          if (categoryTitleText.includes(query) && !categoryHasMatch) {
            categoryQuestions.forEach((item) =>
              item.classList.remove("d-none"),
            );
          }
        } else {
          category.classList.add("d-none");
        }
      });
    });

    // Prevent form submission
    const searchForm = document.querySelector(".js-faq-search-form");
    if (searchForm) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }
  }
});
