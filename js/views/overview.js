async function renderOverview(mount) {
  mount.innerHTML = `
    <div class="page-head">
      <h1>Custodian</h1>
      <p>Where the benefits administration industry gets read straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure, in one place.</p>
    </div>
    <div style="border-top:1px solid var(--border); padding-top:18px; max-width:70ch;">
      <p style="color:var(--ink-soft); font-size:0.92rem; line-height:1.65; margin:0;">
        <b style="color:var(--ink);">Insights</b>, <b style="color:var(--ink);">Landscape</b>, and <b style="color:var(--ink);">Kelly Benefits</b> are fully built out — pick any of them from the sidebar. Field Notes and the Strategy Workbench are backed by a real synced database; sign in from the top bar to add or edit.
      </p>
    </div>
  `;
}
Router.register("overview", renderOverview);
