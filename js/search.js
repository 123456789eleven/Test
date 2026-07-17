const SearchIndex = {
  items: [],
  register(source, entries) {
    this.items = this.items.filter(i => i.source !== source);
    entries.forEach(e => this.items.push({ source, ...e }));
  },
  query(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return this.items
      .filter(i => (i.title + " " + (i.snippet || "")).toLowerCase().includes(needle))
      .slice(0, 12);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("globalSearch");
  const resultsEl = document.getElementById("searchResults");
  if (!input) return;

  function renderResults(q) {
    if (!q.trim()) { resultsEl.classList.remove("show"); return; }
    const results = SearchIndex.query(q);
    resultsEl.innerHTML = results.length
      ? results.map(r => `<a class="search-result-item" href="#/${r.route}">
          <div class="src">${r.source}</div>
          <div class="ttl">${r.title}</div>
        </a>`).join("")
      : `<div class="search-empty">No matches yet — only pages you've visited this session are indexed so far.</div>`;
    resultsEl.classList.add("show");
  }

  input.addEventListener("input", () => renderResults(input.value));
  input.addEventListener("focus", () => { if (input.value.trim()) renderResults(input.value); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) resultsEl.classList.remove("show");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { input.blur(); resultsEl.classList.remove("show"); }
  });
  resultsEl.addEventListener("click", () => resultsEl.classList.remove("show"));
});
