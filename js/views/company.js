(function () {
  let fitSaveTimeout;

  // Own small fetch, same "each page owns its data query" convention as the other
  // views — only what this page actually needs (divisions for the flow-edge name
  // lookup, leadership for the roster), not the full org structure hologram.js loads.
  async function loadCompanyOrgData() {
    const [divR, peopleR] = await Promise.all([
      supabaseClient.from("org_divisions").select("*").order("sort_order"),
      supabaseClient.from("org_people").select("*").order("sort_order")
    ]);
    for (const r of [divR, peopleR]) if (r.error) throw r.error;
    return {
      divisions: divR.data,
      leadership: peopleR.data.map(p => ({ id: p.id, name: p.name, title: p.title, note: p.note, parent: p.parent, cross: p.cross_divisions }))
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

  async function renderCompanyView(mount) {
    mount.innerHTML = `
      <div class="kb-hero">
        <div class="kb-hero-content">
          <h1>Kelly Benefits — Company</h1>
          <p>The narrative behind the structure — where the company came from, how the four divisions read strategically, and how a client relationship actually flows between them. For the live, interactive org structure itself, see <a href="#/hologram" style="color:#fff; text-decoration:underline;">the Hologram</a>.</p>
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

      <div class="snapshot" id="companySnapshot"></div>

      <div class="integration-box" id="companyIntegrationNote"></div>

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
        <p id="companyEnrollmentNote"></p>
        <p id="companyReconciliationNote"></p>
      </div>

      <div class="swot-card">
        <h3>SWOT</h3>
        <p class="cap">The circle and the competitor data, synthesized into a strategic read — not a description of what Kelly is, but a read on the position it's actually in.</p>
        <div class="swot-grid" id="companySwotGrid"></div>
      </div>

      <p class="section-label">Leadership — split across the four divisions</p>
      <div class="leadership" id="companyLeadership"></div>

      <div class="timeline-card">
        <h3>Company history</h3>
        <p class="cap">50 years from a bedroom in Maryland to four connected divisions — the growth pattern (family stability, then acquisition, then outside technology leadership) tells its own story.</p>
        <div class="timeline" id="companyHistoryTimeline"></div>
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
    };
    window.addEventListener("custodian:authchange", onAuthOrMigrate);
    window.addEventListener("custodian:migrated", onAuthOrMigrate);

    let staticData;
    try {
      staticData = await fetch("data/company.json").then(r => r.json());
    } catch (err) {
      mount.querySelector(".kb-hero").insertAdjacentHTML("afterend", `<p class="loading">Couldn't load Kelly Benefits data (${err.message}).</p>`);
      return () => {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
      };
    }

    let data = {
      snapshot: staticData.snapshot, history: staticData.history,
      swot: staticData.swot, integrationNote: staticData.integrationNote, crossCutting: staticData.crossCutting,
      divisionFlow: staticData.divisionFlow, divisionFlowNote: staticData.divisionFlowNote
    };
    try {
      Object.assign(data, await loadCompanyOrgData());
    } catch (err) {
      console.error("Live org data unavailable, showing last saved structure:", err);
      Object.assign(data, { divisions: staticData.divisions, leadership: staticData.leadership });
    }

    const heroCovered = ["Founded", "Scale", "Recognition"];
    document.getElementById("companySnapshot").innerHTML = data.snapshot.filter(s => !heroCovered.includes(s.l)).map(s => `
      <div class="snap-card"><div class="l">${s.l}</div><div class="v">${s.v}</div></div>`).join("");

    document.getElementById("companyLeadership").innerHTML = data.leadership.map(p => `
      <div class="leader-card"><div class="name">${p.name}</div><div class="title">${p.title}</div><div class="note">${p.note}</div></div>`).join("");

    document.getElementById("companyHistoryTimeline").innerHTML = data.history.map(h => `
      <div class="tl-item">
        <div class="tl-date mono">${h.date}</div>
        <div class="tl-deal">${h.deal}${h.value ? ` <span class="mono" style="font-weight:400; color:var(--ink-muted); font-size:0.8rem;">— ${h.value}</span>` : ""}</div>
        <div class="tl-sig">${h.sig}</div>
      </div>`).join("");

    document.getElementById("companyIntegrationNote").innerHTML = `<b>${data.integrationNote.split(" — ")[0]} —</b> ${data.integrationNote.split(" — ").slice(1).join(" — ")}`;
    if (data.divisionFlowNote) document.getElementById("flowNote").textContent = data.divisionFlowNote;
    document.getElementById("companyEnrollmentNote").innerHTML = `<b>Enrollment</b> ${data.crossCutting.enrollment.replace(/^Enrollment\s*/, "")}`;
    document.getElementById("companyReconciliationNote").innerHTML = `<b>Reconciliation</b> ${data.crossCutting.reconciliation.replace(/^Reconciliation\s*/, "")}`;

    const swotOrder = [
      ["strengths", "Strengths"], ["weaknesses", "Weaknesses"],
      ["opportunities", "Opportunities"], ["threats", "Threats"]
    ];
    document.getElementById("companySwotGrid").innerHTML = swotOrder.map(([key, label]) => `
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

    const onCobraFullscreenClick = () => {
      const wrap = document.getElementById("cobraWrap");
      if (!document.fullscreenElement) { wrap.requestFullscreen(); } else { document.exitFullscreen(); }
    };
    document.getElementById("cobraFullscreen").addEventListener("click", onCobraFullscreenClick);
    const onFullscreenChange = () => {
      const wrap = document.getElementById("cobraWrap");
      const btn = document.getElementById("cobraFullscreen");
      if (!wrap || !btn) return;
      btn.textContent = document.fullscreenElement === wrap ? "✕ Exit fullscreen" : "⛶ Fullscreen";
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    SearchIndex.register("Company", (data.leadership || []).map(p => ({ title: p.name, snippet: p.title, route: "company" })));

    return () => {
      window.removeEventListener("custodian:authchange", onAuthOrMigrate);
      window.removeEventListener("custodian:migrated", onAuthOrMigrate);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }

  Router.register("company", renderCompanyView);
})();
