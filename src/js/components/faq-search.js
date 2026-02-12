export default function initFaqSearch() {
  const searchInputs = document.querySelectorAll(".js-faq-search-input");
  const categories = document.querySelectorAll(".faq-item");
  const searchForms = document.querySelectorAll(".js-faq-search-form");
  const noResultsMessage = document.querySelector(".faq-no-results");

  if (searchInputs.length === 0 || categories.length === 0) return;

  const handleSearch = (query) => {
    const normalizedQuery = query.toLowerCase().trim();
    let totalMatches = 0;

    categories.forEach((category) => {
      const questions = category.querySelectorAll(".accordion-faq");
      const title = category.querySelector(".faq_title")?.textContent.toLowerCase() || "";
      
      if (normalizedQuery === "") {
        category.classList.remove("d-none");
        questions.forEach(q => q.classList.remove("d-none"));
        return;
      }

      let hasVisibleQuestion = false;

      questions.forEach((item) => {
        const text = item.textContent.toLowerCase();
        const isMatch = text.includes(normalizedQuery);
        item.classList.toggle("d-none", !isMatch);
        if (isMatch) hasVisibleQuestion = true;
      });

      const titleMatch = title.includes(normalizedQuery);
      const isVisible = hasVisibleQuestion || titleMatch;

      category.classList.toggle("d-none", !isVisible);
      if (isVisible) totalMatches++;

      // If title matches but no questions match, show all questions in that category
      if (titleMatch && !hasVisibleQuestion) {
        questions.forEach(q => q.classList.remove("d-none"));
      }
    });

    if (noResultsMessage) {
      noResultsMessage.classList.toggle("d-none", normalizedQuery === "" || totalMatches > 0);
    }
  };

  searchInputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const value = e.target.value;
      
      // Sync all search inputs
      searchInputs.forEach(other => {
        if (other !== input) other.value = value;
      });

      handleSearch(value);
    });
  });

  searchForms.forEach(form => {
    form.addEventListener("submit", (e) => e.preventDefault());
  });
}