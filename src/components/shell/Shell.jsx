import { useEffect, useState } from "react";
import { NavLink, Outlet, useMatches } from "react-router-dom";
import SearchBox from "./SearchBox";
import AuthButton from "./AuthButton";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/insights", label: "Insights" },
  { to: "/landscape", label: "Landscape" },
  { to: "/hologram", label: "Hologram" },
  { to: "/company", label: "Company" },
];

export default function Shell() {
  const matches = useMatches();
  const fullscreen = matches.some((m) => m.handle && m.handle.fullscreen);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("route-fullscreen", fullscreen);
    document.body.classList.toggle("sidebar-lock", sidebarOpen);
  }, [fullscreen, sidebarOpen]);

  useEffect(() => { setSidebarOpen(false); }, [matches[matches.length - 1]?.pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <a className="brand wordmark" href="./" style={{ textDecoration: "none", display: "block" }}>Custodian</a>
        <nav id="sidenav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="dot" />{item.label}
            </NavLink>
          ))}
          <a href="study/">
            <span className="dot" />Exam Prep ↗
          </a>
        </nav>
        <div className="foot">One app, one address — no more separate .html pages to keep in sync.</div>
      </aside>
      <div className={`sidebar-backdrop${sidebarOpen ? " show" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div className="main-col">
        <div className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <SearchBox />
          <AuthButton />
        </div>
        <main id="viewMount">
          <Outlet />
        </main>
        <footer className="app-footer">Custodian — a personal industry-intelligence project. Not affiliated with or endorsed by any employer.</footer>
      </div>
    </div>
  );
}
