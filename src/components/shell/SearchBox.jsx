import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIndex } from "../../lib/searchIndex";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const results = query.trim() ? SearchIndex.query(query) : [];

  function handleBlurCapture(e) {
    if (!wrapRef.current.contains(e.relatedTarget)) setOpen(false);
  }

  return (
    <div className="search-wrap" ref={wrapRef} onBlurCapture={handleBlurCapture}>
      <span className="icon">⌕</span>
      <input
        id="globalSearch"
        placeholder="Search everything (notes, insights, companies)…"
        autoComplete="off"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") { e.currentTarget.blur(); setOpen(false); } }}
      />
      <div className={`search-results${open && query.trim() ? " show" : ""}`}>
        {results.length
          ? results.map((r, i) => (
            <Link key={i} className="search-result-item" to={`/${r.route}`} onClick={() => setOpen(false)}>
              <div className="src">{r.source}</div>
              <div className="ttl">{r.title}</div>
            </Link>
          ))
          : <div className="search-empty">No matches yet — only pages you've visited this session are indexed so far.</div>}
      </div>
    </div>
  );
}
