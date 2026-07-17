async function renderOverview(mount) {
  mount.innerHTML = `
    <div class="page-head">
      <h1>Custodian</h1>
      <p>Where the benefits administration industry gets read straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure, in one place.</p>
    </div>
    <div style="border:1px solid var(--border); border-radius:12px; background:var(--surface); padding:20px 22px; max-width:70ch;">
      <p style="color:var(--ink-soft); font-size:0.92rem; line-height:1.65; margin:0 0 10px;">
        This is mid-rebuild — moving from five separate pages into one connected app with a shared sidebar and search across everything you've logged.
      </p>
      <p style="color:var(--ink-soft); font-size:0.92rem; line-height:1.65; margin:0;">
        <b style="color:var(--ink);">Insights</b> and <b style="color:var(--ink);">Landscape</b> are fully ported — pick either from the sidebar. <b style="color:var(--ink);">Kelly Benefits</b> is still being migrated; until it's ready, the original page remains live and unaffected at
        <a href="company.html" style="color:var(--accent);">company.html</a>.
      </p>
    </div>
  `;
}
Router.register("overview", renderOverview);
