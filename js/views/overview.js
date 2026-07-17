async function renderOverview(mount) {
  mount.innerHTML = `
    <div class="page-head">
      <h1>Custodian</h1>
      <p>Where the benefits administration industry gets read straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure, in one place.</p>
    </div>
    <div style="border:1px solid var(--border); border-radius:12px; background:var(--surface); padding:20px 22px; max-width:70ch;">
      <p style="color:var(--ink-soft); font-size:0.92rem; line-height:1.65; margin:0;">
        <b style="color:var(--ink);">Insights</b>, <b style="color:var(--ink);">Landscape</b>, and <b style="color:var(--ink);">Kelly Benefits</b> are all fully ported into this shell — pick any of them from the sidebar. Notes and the Strategy Workbench are still backed by this browser's local storage for now; a real synced backend is next.
      </p>
    </div>
  `;
}
Router.register("overview", renderOverview);
