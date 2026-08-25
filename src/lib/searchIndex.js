// Session-only search index — pages register their content on mount, so only
// pages you've actually visited this session are searchable. Same behavior as
// the vanilla-JS version; a React rewrite could build this eagerly instead,
// but that's a deliberate future change, not carried over silently here.
let items = [];
const listeners = new Set();

export const SearchIndex = {
  register(source, entries) {
    items = items.filter((i) => i.source !== source).concat(entries.map((e) => ({ source, ...e })));
    listeners.forEach((fn) => fn());
  },
  query(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return items
      .filter((i) => (i.title + " " + (i.snippet || "")).toLowerCase().includes(needle))
      .slice(0, 12);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
