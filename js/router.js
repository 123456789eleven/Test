function setSidebarOpen(open) {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.toggle("open", open);
  if (backdrop) backdrop.classList.toggle("show", open);
  document.body.classList.toggle("sidebar-lock", open);
}

const Router = {
  routes: {},
  register(path, renderFn) { this.routes[path] = renderFn; },
  async navigate() {
    const hash = window.location.hash.replace(/^#\/?/, "") || "overview";
    const [route, ...rest] = hash.split("/");
    document.querySelectorAll("#sidenav a[data-route]").forEach(a => {
      a.classList.toggle("active", a.dataset.route === route);
    });
    const mount = document.getElementById("viewMount");
    mount.innerHTML = `
      <div class="view-skeleton">
        <div class="sk-block sk-hero"></div>
        <div class="sk-block sk-line" style="width:60%;"></div>
        <div class="sk-block sk-line" style="width:80%;"></div>
      </div>
    `;
    const renderFn = this.routes[route];
    if (renderFn) {
      try {
        await renderFn(mount, rest.join("/"));
      } catch (err) {
        mount.innerHTML = `<div class="loading">Something broke loading this view.<br><span class="mono" style="font-size:0.78rem;">${err.message}</span></div>`;
        console.error(err);
      }
    } else {
      mount.innerHTML = `<div class="loading">Unknown route: ${route}</div>`;
    }
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  },
  init() {
    window.addEventListener("hashchange", () => {
      // In-page anchors (e.g. "#sec-connections" from a page's own sub-nav) aren't routes —
      // only "#/..." hashes (or none, meaning the default route) should trigger a re-render.
      if (window.location.hash && !window.location.hash.startsWith("#/")) return;
      this.navigate();
    });
    this.navigate();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("menuToggle");
  const backdrop = document.getElementById("sidebarBackdrop");
  const sidebar = document.getElementById("sidebar");
  if (toggle) toggle.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
  if (backdrop) backdrop.addEventListener("click", () => setSidebarOpen(false));
});
