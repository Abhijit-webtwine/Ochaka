export default function initFaqSearch() {
  const searchInput = document.querySelector(".js-faq-search-input");
  const categories = document.querySelectorAll(".faq-item");

  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query === "") {
      categories.forEach((cat) => {
        cat.classList.remove("d-none");
        cat.querySelectorAll(".accordion-faq").forEach((item) => {
          item.classList.remove("d-none");
        });
      });
      return;
    }

    categories.forEach((category) => {
      const categoryQuestions = category.querySelectorAll(".accordion-faq");
      const categoryTitleEl = category.querySelector(".faq_title");
      const categoryTitleText = categoryTitleEl
        ? categoryTitleEl.textContent.toLowerCase()
        : "";

      let categoryHasMatch = false;

      categoryQuestions.forEach((item) => {
        const questionText = item
          .querySelector(".accordion-title")
          .textContent.toLowerCase();

        const answerText = item
          .querySelector(".accordion-body")
          .textContent.toLowerCase();

        const isMatch =
          questionText.includes(query) || answerText.includes(query);

        item.classList.toggle("d-none", !isMatch);

        if (isMatch) categoryHasMatch = true;
      });

      const categoryTitleMatches = categoryTitleText.includes(query);

      if (categoryHasMatch || categoryTitleMatches) {
        category.classList.remove("d-none");

        // If only title matches, show all questions
        if (categoryTitleMatches && !categoryHasMatch) {
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
    searchForm.addEventListener("submit", (e) => e.preventDefault());
  }
}