(function () {
  let fitSaveTimeout;

  // Own data fetch, deliberately not shared with orgtree.js — see PLAN.md.
  async function loadOrgData() {
    const [divR, vertR, funcR, peopleR, connR] = await Promise.all([
      supabaseClient.from("org_divisions").select("*").order("sort_order"),
      supabaseClient.from("org_verticals").select("*").order("sort_order"),
      supabaseClient.from("org_functions").select("*").order("sort_order"),
      supabaseClient.from("org_people").select("*").order("sort_order"),
      supabaseClient.from("org_connections").select("*")
    ]);
    for (const r of [divR, vertR, funcR, peopleR, connR]) if (r.error) throw r.error;

    const verticals = {};
    vertR.data.forEach(v => { verticals[v.id] = { division: v.division, name: v.name, confirmed: v.confirmed, desc: v.desc, funcs: [] }; });
    funcR.data.forEach(f => { if (verticals[f.vertical]) verticals[f.vertical].funcs.push({ id: f.id, label: f.label, confirmed: f.confirmed }); });

    return {
      divisions: divR.data,
      verticals,
      leadership: peopleR.data.map(p => ({ id: p.id, name: p.name, title: p.title, note: p.note, parent: p.parent, cross: p.cross_divisions })),
      processConnections: connR.data.map(c => ({ from: c.from_id, to: c.to_id, type: c.type, note: c.note }))
    };
  }

  function updateFitGate() {
    const el = document.getElementById("fitText");
    const hint = document.getElementById("fitHint");
    if (!el || !hint) return;
    if (Auth.isSignedIn()) {
      el.readOnly = false;
      hint.textContent = "Ground the rest of this page in your actual seat — it changes what \"moving up\" should mean.";
    } else {
      el.readOnly = true;
      hint.innerHTML = `Sign in to edit. <button id="fitAuthBtn" style="background:none;border:none;color:var(--accent);text-decoration:underline;cursor:pointer;font:inherit;padding:0;">Sign in</button>`;
      const btn = document.getElementById("fitAuthBtn");
      if (btn) btn.addEventListener("click", () => document.getElementById("authButton").click());
    }
  }

  async function loadFitText() {
    const el = document.getElementById("fitText");
    if (!el) return;
    const { data } = await supabaseClient.from("site_text").select("content").eq("key", "fit").maybeSingle();
    if (!document.getElementById("fitText")) return;
    el.value = (data && data.content) || "";
  }

  function wireFitText() {
    const el = document.getElementById("fitText");
    el.addEventListener("input", () => {
      if (!Auth.isSignedIn()) return;
      clearTimeout(fitSaveTimeout);
      fitSaveTimeout = setTimeout(() => {
        supabaseClient.from("site_text").upsert({ key: "fit", content: el.value });
      }, 700);
    });
  }

  async function renderFullCircleView(mount) {
    mount.innerHTML = `
      <div class="kb-hero">
        <div class="kb-hero-content">
          <h1>Kelly Benefits — Full Circle</h1>
          <p>Not an org chart — a map of how Kelly Benefits actually functions as one connected whole. Divisions, Corporate Functions, departments, and people, and how they connect to each other and to client outcomes. For strict reporting structure, see <a href="#/org-tree">Org Tree</a> instead.</p>
        </div>
        <div class="kb-hero-stats">
          <div class="kb-stat"><div class="kb-stat-big">50</div><div class="kb-stat-label">Years since founding — 50th anniversary this year</div></div>
          <div class="kb-stat"><div class="kb-stat-big">10K+</div><div class="kb-stat-label">Corporate clients, 600,000+ covered lives</div></div>
          <div class="kb-stat"><div class="kb-stat-big">23</div><div class="kb-stat-label">Years ranked #1 in Maryland (2002–2024)</div></div>
        </div>
      </div>

      <div class="fit-box">
        <div class="lbl">Where I fit</div>
        <textarea id="fitText" placeholder="e.g. I work in COBRA administration within Kelly Benefits Advantage, handling..."></textarea>
        <div class="hint" id="fitHint">Ground the rest of this page in your actual seat — it changes what "moving up" should mean.</div>
      </div>

      <div class="integration-box" id="fcIntegrationNote"></div>

      <div class="cmap-wrap" id="cmapWrap">
        <div class="cmap-head">
          <div>
            <h3>Connection Map</h3>
            <p class="cap">How work actually hands off or overlaps between departments, aggregated from the specific job functions underneath — plus Corporate Functions' reach and how every division conceptually traces to client outcomes. Click any node to trace its connections.</p>
          </div>
          <button id="cmapManageConnections" class="orgmap-fs-btn" style="display:none;">🔗 Manage connections</button>
        </div>
        <div id="fcConnectionMap"></div>
      </div>

      <div class="workflow-card">
        <h3>How the client relationship actually flows</h3>
        <p class="cap">A different lens on the same circle — the direction work and data actually move as a single client relationship travels through all four divisions, on repeat, for as long as they stay a client. Click any division or arrow for detail.</p>
        <div id="flowContainer"></div>
        <div class="flow-detail" id="flowDetail"></div>
        <p class="chart-caption" id="flowNote" style="margin-top:14px;"></p>
      </div>

      <div class="cobra-wrap" id="cobraWrap">
        <div class="cobra-head">
          <div>
            <h3>The real COBRA administration process, start to finish</h3>
            <p class="cobra-source" id="cobraSourceNote">Loading…</p>
          </div>
          <button id="cobraFullscreen" class="orgmap-fs-btn">⛶ Fullscreen</button>
        </div>
        <div id="cobraProcess"></div>
      </div>
      <div class="crosscutting-box">
        <h4>Where "enrollment" and "reconciliation" actually sit</h4>
        <p id="fcEnrollmentNote"></p>
        <p id="fcReconciliationNote"></p>
      </div>

      <div class="swot-card">
        <h3>SWOT</h3>
        <p class="cap">The circle and the competitor data, synthesized into a strategic read — not a description of what Kelly is, but a read on the position it's actually in.</p>
        <div class="swot-grid" id="fcSwotGrid"></div>
      </div>
    `;

    await Auth.ready;
    updateFitGate();
    loadFitText();
    wireFitText();

    const onAuthOrMigrate = () => {
      if (!document.getElementById(mount.id)) {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
        return;
      }
      updateFitGate();
      loadFitText();
      updateConnEditGate();
    };
    window.addEventListener("custodian:authchange", onAuthOrMigrate);
    window.addEventListener("custodian:migrated", onAuthOrMigrate);

    let staticData;
    try {
      staticData = await fetch("data/company.json").then(r => r.json());
    } catch (err) {
      mount.innerHTML = `<div style="color:var(--warn);">Couldn't load Kelly Benefits data (${err.message}).</div>`;
      return;
    }

    let data = {
      swot: staticData.swot, integrationNote: staticData.integrationNote, crossCutting: staticData.crossCutting,
      divisionFlow: staticData.divisionFlow, divisionFlowNote: staticData.divisionFlowNote
    };
    try {
      Object.assign(data, await loadOrgData());
    } catch (err) {
      console.error("Live org data unavailable, showing last saved structure:", err);
      Object.assign(data, {
        divisions: staticData.divisions, verticals: staticData.verticals,
        leadership: staticData.leadership, processConnections: staticData.processConnections
      });
    }

    document.getElementById("fcIntegrationNote").innerHTML = `<b>${data.integrationNote.split(" — ")[0]} —</b> ${data.integrationNote.split(" — ").slice(1).join(" — ")}`;
    if (data.divisionFlowNote) document.getElementById("flowNote").textContent = data.divisionFlowNote;
    document.getElementById("fcEnrollmentNote").innerHTML = `<b>Enrollment</b> ${data.crossCutting.enrollment.replace(/^Enrollment\s*/, "")}`;
    document.getElementById("fcReconciliationNote").innerHTML = `<b>Reconciliation</b> ${data.crossCutting.reconciliation.replace(/^Reconciliation\s*/, "")}`;

    const swotOrder = [
      ["strengths", "Strengths"], ["weaknesses", "Weaknesses"],
      ["opportunities", "Opportunities"], ["threats", "Threats"]
    ];
    document.getElementById("fcSwotGrid").innerHTML = swotOrder.map(([key, label]) => `
      <div class="swot-item ${key}">
        <h4>${label}</h4>
        <ul>${data.swot[key].map(item => `<li>${item}</li>`).join("")}</ul>
      </div>`).join("");

    try {
      const cobraData = await fetch("data/cobra-process.json").then(r => r.json());
      document.getElementById("cobraSourceNote").textContent = cobraData.intro;
      renderCobraProcess("cobraProcess", cobraData);
    } catch (err) {
      document.getElementById("cobraSourceNote").textContent = `Couldn't load the COBRA process data (${err.message}).`;
    }

    function renderFlowEdgeDetail(edge) {
      const panel = document.getElementById("flowDetail");
      if (!panel) return;
      const fromName = (data.divisions.find(d => d.id === edge.from) || {}).name || edge.from;
      const toName = (data.divisions.find(d => d.id === edge.to) || {}).name || edge.to;
      panel.innerHTML = `<b>${fromName} → ${toName}: ${edge.label}.</b> ${edge.detail}`;
      panel.classList.add("show");
    }
    renderDivisionFlow("flowContainer", { companyData: data, onEdgeClick: renderFlowEdgeDetail });

    let connectionMapControl = renderConnectionMap("fcConnectionMap", data);

    function updateConnEditGate() {
      const btn = document.getElementById("cmapManageConnections");
      if (btn) btn.style.display = Auth.isSignedIn() ? "" : "none";
    }
    updateConnEditGate();

    async function refreshConnections() {
      try {
        Object.assign(data, await loadOrgData());
      } catch (err) {
        console.error("Failed to refresh connection data:", err);
      }
      connectionMapControl = renderConnectionMap("fcConnectionMap", data);
    }
    OrgEdit.init(() => data, refreshConnections);

    document.getElementById("cmapManageConnections").addEventListener("click", () => OrgEdit.openConnections());

    document.getElementById("cobraFullscreen").addEventListener("click", () => {
      const wrap = document.getElementById("cobraWrap");
      if (!document.fullscreenElement) {
        wrap.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const wrap = document.getElementById("cobraWrap");
      const btn = document.getElementById("cobraFullscreen");
      if (!wrap || !btn) return;
      btn.textContent = document.fullscreenElement === wrap ? "✕ Exit fullscreen" : "⛶ Fullscreen";
    });

    SearchIndex.register("Full Circle", [
      ...data.divisions.map(d => ({ title: `Full Circle: ${d.name}`, snippet: d.desc, route: "full-circle" }))
    ]);
  }

  Router.register("full-circle", renderFullCircleView);
})();
