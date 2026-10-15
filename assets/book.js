(function () {
  "use strict";

  const PAGE_COUNT = 86;
  const pages = document.getElementById("pdfPages");
  const pageInput = document.getElementById("pageInput");

  function pageFile(page) {
    return `resources/pages/page-${String(page).padStart(3, "0")}.webp`;
  }

  function goToPage(page) {
    const safePage = Math.min(PAGE_COUNT, Math.max(1, Number(page) || 1));
    pageInput.value = safePage;
    document.getElementById(`book-page-${safePage}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const fragment = document.createDocumentFragment();
  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const figure = document.createElement("figure");
    figure.className = "book-page";
    figure.id = `book-page-${page}`;
    figure.dataset.page = page;

    const image = document.createElement("img");
    image.src = pageFile(page);
    image.alt = `英语启蒙红宝书第${page}页`;
    image.loading = page <= 2 ? "eager" : "lazy";
    image.decoding = "async";
    if (page === 1) image.fetchPriority = "high";

    const caption = document.createElement("figcaption");
    caption.textContent = `第 ${page} / ${PAGE_COUNT} 页`;
    figure.append(image, caption);
    fragment.appendChild(figure);
  }
  pages.appendChild(fragment);

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) pageInput.value = visible.target.dataset.page;
  }, { rootMargin: "-20% 0px -55%", threshold: [0.1, 0.4, 0.7] });
  document.querySelectorAll(".book-page").forEach((page) => observer.observe(page));

  document.getElementById("previousPage").addEventListener("click", () => goToPage(Number(pageInput.value) - 1));
  document.getElementById("nextPage").addEventListener("click", () => goToPage(Number(pageInput.value) + 1));
  pageInput.addEventListener("change", () => goToPage(pageInput.value));
})();
