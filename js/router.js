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
    mount.innerHTML = '<div class="loading">Loading…</div>';
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
    document.getElementById("sidebar").classList.remove("open");
    window.scrollTo(0, 0);
  },
  init() {
    window.addEventListener("hashchange", () => this.navigate());
    this.navigate();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (toggle) toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
});
