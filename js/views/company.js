(function () {
  const STATUS_LABEL = { idea: "Idea", considering: "Considering", proposed: "Proposed", active: "Active", done: "Done", shelved: "Shelved" };
  const STATUS_ORDER = ["idea", "considering", "proposed", "active", "done", "shelved"];
  const IMPACT_LABEL = { high: "High impact", med: "Medium impact", low: "Low impact" };
  const EFFORT_LABEL = { low: "Low effort", med: "Medium effort", high: "High effort" };

  let wbFilter = "all";
  let fitSaveTimeout;

  function fmtVal(v) { return v === null ? "n/a" : "$" + v + "B"; }

  async function renderCompanyView(mount) {
    mount.innerHTML = `
      <div class="kb-hero">
        <div class="kb-hero-content">
          <h1>Kelly Benefits — The Full Circle</h1>
          <p>A privately-held, family-owned benefits company built around four connected divisions — each one sells into (or draws from) the next, forming a closed loop of the client relationship rather than a single-service business.</p>
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

      <div class="tabs" id="coTabs">
        <button data-view="overview" class="active">Overview</button>
        <button data-view="people">People &amp; History</button>
        <button data-view="strategy">Strategy</button>
        <button data-view="notes">Workbench</button>
      </div>

      <div class="view active" id="coview-overview">
        <nav class="kb-subnav" id="kbSubnav">
          <a href="#sec-structure" data-sec="structure" class="active">Structure</a>
          <a href="#sec-connections" data-sec="connections">Connections</a>
          <a href="#sec-cobra" data-sec="cobra">COBRA Process</a>
        </nav>

        <section id="sec-structure" class="kb-section">
          <p class="section-label">Company details</p>
          <div class="snapshot" id="coSnapshot"></div>

          <div class="orgmap-wrap" id="orgmapWrap">
            <div class="orgmap-head">
              <p class="cap">The company as it's actually structured: four divisions and their leaders, the corporate functions (HR, Finance, Marketing, Technology) that support all four, and — down through Kelly Benefits Advantage — every one of its five verticals. Click a vertical's ▸ to expand its individual job functions in place; green borders mean confirmed, gray means estimated. A 🔗 on a function means it's connected to others — click it to see what feeds it, what it feeds, and what it shares systems with.</p>
              <button id="orgmapFullscreen" class="orgmap-fs-btn">⛶ Fullscreen</button>
            </div>
            <div id="coOrgMap" class="orgmap-container"></div>
            <p class="orgmap-caption">Workflow within Advantage: Win → Construct → then splits into Protect, Connect, and Serve. Construct, Connect, and Serve also share enrollment responsibility.</p>
          </div>

          <div id="orgDetail"></div>

          <div class="integration-box" id="coIntegrationNote"></div>

          <div class="workflow-card">
            <h3>How the client relationship actually flows</h3>
            <p class="cap">The org chart above shows who reports to whom. This shows something different — the direction work and data actually move as a single client relationship travels through all four divisions, on repeat, for as long as they stay a client. Click any division or arrow for detail.</p>
            <div id="flowContainer"></div>
            <div class="flow-detail" id="flowDetail"></div>
            <p class="chart-caption" id="flowNote" style="margin-top:14px;"></p>
          </div>
        </section>

        <section id="sec-connections" class="kb-section">
          <p class="kb-section-bridge">The chart above shows the formal structure — who reports to whom. This shows something the org chart can't: the real human ties that cut across it.</p>
          <div class="cmap-wrap" id="cmapWrap">
            <div class="cmap-head">
              <div>
                <h3>How the whole company actually connects</h3>
                <p class="cap">Every senior leader, grouped by division — plus the real cross-division ties (John Kelly spans Strategies &amp; Advisory, David Kelly spans Payroll &amp; Advantage, Wesley Mace spans Product and both operating divisions) and Corporate Functions' reach across all four. Click anyone to trace their direct connections; everything else fades.</p>
              </div>
              <button id="cmapFullscreen" class="cmap-fs-btn">⛶ Fullscreen</button>
            </div>
            <div id="cmapContainer" class="cmap-container"></div>
            <div class="cmap-legend">
              <span><i style="background:#f59e0b"></i>Executive</span>
              <span><i style="background:#3b82f6"></i>Strategies</span>
              <span><i style="background:#10b981"></i>Advantage</span>
              <span><i style="background:#06b6d4"></i>Payroll</span>
              <span><i style="background:#8b5cf6"></i>Advisory</span>
              <span><i style="background:#ec4899"></i>Corporate Functions</span>
              <span>— bright curved lines = real cross-division ties</span>
            </div>
          </div>
          <div id="cmapDetail"></div>
        </section>

        <section id="sec-cobra" class="kb-section">
          <p class="kb-section-bridge">All of that exists to do the actual work. Here's exactly how one process — COBRA administration, the Connect vertical above — really runs, phase by phase.</p>
          <div class="cobra-intro">
            <h3>The real COBRA administration process, start to finish</h3>
            <p class="cap" id="cobraSourceNote">Loading…</p>
          </div>
          <div id="cobraProcess"></div>
          <div class="crosscutting-box">
            <h4>Where "enrollment" and "reconciliation" actually sit</h4>
            <p id="coEnrollmentNote"></p>
            <p id="coReconciliationNote"></p>
          </div>
        </section>
      </div>

      <div class="view" id="coview-people">
        <p class="section-label">Leadership — split across the four divisions</p>
        <div class="leadership" id="coLeadership"></div>
        <div class="timeline-card">
          <h3>Company history</h3>
          <p class="cap">50 years from a bedroom in Maryland to four connected divisions — the growth pattern (family stability, then acquisition, then outside technology leadership) tells its own story.</p>
          <div class="timeline" id="coHistoryTimeline"></div>
        </div>
      </div>

      <div class="view" id="coview-strategy">
        <div class="swot-card">
          <h3>SWOT</h3>
          <p class="cap">The circle and the competitor data, synthesized into a strategic read — not a description of what Kelly is, but a read on the position it's actually in.</p>
          <div class="swot-grid" id="coSwotGrid"></div>
        </div>
      </div>

      <div class="view" id="coview-notes">
        <div class="notes-card">
          <h3>Strategy workbench</h3>
          <p class="cap">Not just a list — a place to actually decide what's worth doing. Score each idea on impact and effort, watch where it lands, then move it forward. This is where a visible improvement project actually gets picked, not just written down.</p>
          <div id="coWbAuthGate"></div>
          <div class="note-form" id="coNoteForm">
            <textarea id="coNoteText" placeholder="What would you change, build, or test?"></textarea>
            <div class="row2">
              <input id="coNoteRelated" placeholder="Related to (optional — e.g. Advantage, COBRA process)" style="flex:1.4;" />
              <select id="coNoteImpact"><option value="high">High impact</option><option value="med" selected>Medium impact</option><option value="low">Low impact</option></select>
              <select id="coNoteEffort"><option value="low">Low effort</option><option value="med" selected>Medium effort</option><option value="high">High effort</option></select>
              <button id="coNoteAdd">Add to workbench</button>
            </div>
          </div>

          <div class="wb-matrix-wrap">
            <div class="wb-axis-top">Effort →</div>
            <div class="wb-matrix-row">
              <div class="wb-axis-side">Impact<br>↑</div>
              <div class="wb-matrix" id="coWbMatrix"></div>
            </div>
          </div>

          <div class="wb-filters" id="coWbFilters">
            <button class="wb-filter active" data-status="all">All</button>
            <button class="wb-filter" data-status="idea">Idea</button>
            <button class="wb-filter" data-status="considering">Considering</button>
            <button class="wb-filter" data-status="proposed">Proposed</button>
            <button class="wb-filter" data-status="active">Active</button>
            <button class="wb-filter" data-status="done">Done / Shelved</button>
          </div>
          <div class="notes-list" id="coNotesList"></div>
        </div>
      </div>
    `;

    document.getElementById("coTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      document.querySelectorAll("#coTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("#" + mount.id + " .view").forEach(v => v.classList.remove("active"));
      document.getElementById("coview-" + btn.dataset.view).classList.add("active");
    });

    await Auth.ready;
    updateFitGate();
    loadFitText();
    wireFitText();

    updateWorkbenchGate();
    wireWorkbench();
    renderWorkbenchNotes();

    const onAuthOrMigrate = () => {
      if (!document.getElementById("coWbAuthGate")) {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
        return;
      }
      updateFitGate();
      loadFitText();
      updateWorkbenchGate();
      renderWorkbenchNotes();
    };
    window.addEventListener("custodian:authchange", onAuthOrMigrate);
    window.addEventListener("custodian:migrated", onAuthOrMigrate);

    let data;
    try {
      data = await fetch("data/company.json").then(r => r.json());
    } catch (err) {
      document.getElementById("coview-overview").innerHTML = `<div style="color:var(--warn);">Couldn't load Kelly Benefits data (${err.message}).</div>`;
      return;
    }

    const heroCovered = ["Founded", "Scale", "Recognition"];
    document.getElementById("coSnapshot").innerHTML = data.snapshot.filter(s => !heroCovered.includes(s.l)).map(s => `
      <div class="snap-card"><div class="l">${s.l}</div><div class="v">${s.v}</div></div>`).join("");

    try {
      const cobraData = await fetch("data/cobra-process.json").then(r => r.json());
      document.getElementById("cobraSourceNote").textContent = cobraData.intro;
      renderCobraProcess("cobraProcess", cobraData);
    } catch (err) {
      document.getElementById("cobraSourceNote").textContent = `Couldn't load the COBRA process data (${err.message}).`;
    }

    document.getElementById("coLeadership").innerHTML = data.leadership.map(p => `
      <div class="leader-card"><div class="name">${p.name}</div><div class="title">${p.title}</div><div class="note">${p.note}</div></div>`).join("");

    document.getElementById("coHistoryTimeline").innerHTML = data.history.map(h => `
      <div class="tl-item">
        <div class="tl-date mono">${h.date}</div>
        <div class="tl-deal">${h.deal}${h.value ? ` <span class="mono" style="font-weight:400; color:var(--ink-muted); font-size:0.8rem;">— ${h.value}</span>` : ""}</div>
        <div class="tl-sig">${h.sig}</div>
      </div>`).join("");

    document.getElementById("coIntegrationNote").innerHTML = `<b>${data.integrationNote.split(" — ")[0]} —</b> ${data.integrationNote.split(" — ").slice(1).join(" — ")}`;
    if (data.divisionFlowNote) document.getElementById("flowNote").textContent = data.divisionFlowNote;

    document.getElementById("coEnrollmentNote").innerHTML = `<b>Enrollment</b> ${data.crossCutting.enrollment.replace(/^Enrollment\s*/, "")}`;
    document.getElementById("coReconciliationNote").innerHTML = `<b>Reconciliation</b> ${data.crossCutting.reconciliation.replace(/^Reconciliation\s*/, "")}`;

    const swotOrder = [
      ["strengths", "Strengths"], ["weaknesses", "Weaknesses"],
      ["opportunities", "Opportunities"], ["threats", "Threats"]
    ];
    document.getElementById("coSwotGrid").innerHTML = swotOrder.map(([key, label]) => `
      <div class="swot-item ${key}">
        <h4>${label}</h4>
        <ul>${data.swot[key].map(item => `<li>${item}</li>`).join("")}</ul>
      </div>`).join("");

    function renderDivisionDetail(d) {
      const withVals = d.competitors.filter(c => c.value !== null);
      const max = Math.max(...withVals.map(c => c.value));
      const chartHtml = d.competitors.map(c => `
        <div class="co-hbar-row">
          <div class="lbl">${c.name}${c.note ? `<span class="sub">${c.note}</span>` : ""}</div>
          <div class="co-hbar-track">${c.value !== null ? `<div class="co-hbar-fill ${c.kelly ? "kelly" : ""}" data-w="${(c.value / max) * 100}"></div>` : ""}</div>
          <div class="val mono">${fmtVal(c.value)}</div>
        </div>
      `).join("");
      const leaders = data.leadership.filter(l => l.parent === d.id || (l.cross && l.cross.includes(d.id))).map(l => l.name).join(", ");
      return `
        <div class="dd-head">
          <div><h2>Kelly Benefits ${d.name} — ${d.role}</h2>${leaders ? `<div class="dd-leaders">${leaders}</div>` : ""}</div>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        <p class="desc">${d.desc}</p>
        <div class="scale-note">${d.scale}</div>
        <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-soft); margin-bottom:10px;">${d.unit}</div>
        ${chartHtml}
        <div class="chart-caption">${d.caption}</div>
      `;
    }

    function renderVerticalDetail(key) {
      const v = data.verticals[key];
      return `
        <div class="ad-head">
          <h3>${v.name}</h3>
          <span class="ad-status ${v.confirmed ? "confirmed" : "unconfirmed"}">${v.confirmed ? "Confirmed" : "Estimated — verify"}</span>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        <p style="color:var(--ink-soft); font-size:0.9rem; margin-top:4px;">${v.desc}</p>
        <ul class="ad-func-list">${v.funcs.map(f => `
          <li><span class="ad-pill ${f.confirmed ? "confirmed" : "estimated"}">${f.confirmed ? "confirmed" : "est."}</span> ${f.label}</li>
        `).join("")}</ul>
        ${key === "connect" ? `<a href="#sec-cobra" class="fn-conn-link" style="margin-top:12px;">→ See the full COBRA process, step by step</a>` : ""}
      `;
    }

    function findFunction(id) {
      for (const [key, v] of Object.entries(data.verticals)) {
        const f = v.funcs.find(fn => fn.id === id);
        if (f) return { func: f, vertical: v, verticalKey: key };
      }
      return null;
    }

    function renderFunctionDetail(id) {
      const found = findFunction(id);
      const { func, vertical } = found;
      const conns = (data.processConnections || []).filter(c => c.from === id || c.to === id);
      const feedsInto = conns.filter(c => c.type === "handoff" && c.from === id).map(c => ({ id: c.to, note: c.note }));
      const fedBy = conns.filter(c => c.type === "handoff" && c.to === id).map(c => ({ id: c.from, note: c.note }));
      const shared = conns.filter(c => c.type === "shared").map(c => ({ id: c.from === id ? c.to : c.from, note: c.note }));

      function linkGroup(title, arrow, items) {
        if (!items.length) return "";
        return `
          <div class="fn-conn-group">
            <div class="fn-conn-title">${title}</div>
            ${items.map(it => {
              const target = findFunction(it.id);
              const label = target ? `${target.func.label} (${target.vertical.name})` : it.id;
              return `<button class="fn-conn-link" data-jump="${it.id}"><span class="fn-conn-arrow">${arrow}</span> ${label}<span class="fn-conn-note">${it.note}</span></button>`;
            }).join("")}
          </div>
        `;
      }

      return `
        <div class="ad-head">
          <h3>${func.label}</h3>
          <span class="ad-status ${func.confirmed ? "confirmed" : "unconfirmed"}">${func.confirmed ? "Confirmed" : "Estimated — verify"}</span>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        <p style="color:var(--ink-soft); font-size:0.9rem; margin-top:4px;">Part of <strong>${vertical.name}</strong>.</p>
        ${linkGroup("Feeds into →", "→", feedsInto)}
        ${linkGroup("Fed by ←", "←", fedBy)}
        ${linkGroup("Shares systems with ⇄", "⇄", shared)}
        ${!feedsInto.length && !fedBy.length && !shared.length ? '<p class="notes-empty">No modeled connections yet for this function.</p>' : ""}
      `;
    }

    function renderPersonDetail(name, title, note) {
      return `
        <div class="dd-head">
          <div><h2>${name}</h2><div class="dd-leaders">${title}</div></div>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        ${note ? `<p class="desc">${note}</p>` : ""}
      `;
    }

    function renderGroupDetail() {
      const execIds = ["fx3", "frankIII"];
      const people = data.leadership.filter(l => l.parent === "root" && !execIds.includes(l.id));
      return `
        <div class="dd-head">
          <div><h2>Corporate Functions</h2><div class="dd-leaders">Shared services spanning all four divisions</div></div>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        <ul class="ad-func-list">${people.map(p => `<li><strong style="flex:none; min-width:170px;">${p.name}</strong> ${p.title}</li>`).join("")}</ul>
      `;
    }

    function renderDetailContent(id) {
      const panel = document.getElementById("orgDetail");
      let html = "";
      if (data.divisions.some(d => d.id === id)) {
        html = renderDivisionDetail(data.divisions.find(d => d.id === id));
      } else if (data.verticals[id]) {
        html = renderVerticalDetail(id);
      } else if (id === "corpfn") {
        html = renderGroupDetail();
      } else if (findFunction(id)) {
        html = renderFunctionDetail(id);
      } else if (id === "root") {
        const p = data.leadership.find(l => l.id === "frankIII");
        html = renderPersonDetail(p.name, p.title, p.note);
      } else {
        const p = data.leadership.find(l => l.id === id);
        if (!p) return false;
        html = renderPersonDetail(p.name, p.title, p.note);
      }
      panel.innerHTML = html;
      panel.classList.add("show");
      document.getElementById("closeOrgDetail").addEventListener("click", () => panel.classList.remove("show"));
      panel.querySelectorAll(".fn-conn-link").forEach(btn => {
        btn.addEventListener("click", () => jumpToNode(btn.dataset.jump));
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        panel.querySelectorAll(".co-hbar-fill[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
      }));
      return true;
    }

    function handleOrgNodeClick(id) {
      if (!renderDetailContent(id)) return;
      document.getElementById("orgDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function jumpToNode(targetId) {
      const el = document.querySelector(`.ocn[data-id="${targetId}"]`);
      if (el) {
        const ul = el.closest("ul.oc-fn-list");
        if (ul && !ul.classList.contains("oc-expanded")) {
          ul.classList.add("oc-expanded");
          const toggle = ul.previousElementSibling;
          if (toggle && toggle.classList.contains("oc-toggle")) toggle.classList.add("oc-expanded");
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ocn-jump-highlight");
        setTimeout(() => el.classList.remove("ocn-jump-highlight"), 1600);
      }
      renderDetailContent(targetId);
    }

    renderOrgMap("coOrgMap", { companyData: data, onNodeClick: handleOrgNodeClick });

    function renderFlowEdgeDetail(edge) {
      const panel = document.getElementById("flowDetail");
      if (!panel) return;
      const fromName = (data.divisions.find(d => d.id === edge.from) || {}).name || edge.from;
      const toName = (data.divisions.find(d => d.id === edge.to) || {}).name || edge.to;
      panel.innerHTML = `<b>${fromName} → ${toName}: ${edge.label}.</b> ${edge.detail}`;
      panel.classList.add("show");
    }
    renderDivisionFlow("flowContainer", { companyData: data, onNodeClick: handleOrgNodeClick, onEdgeClick: renderFlowEdgeDetail });

    function renderCmapDetail(node) {
      const panel = document.getElementById("cmapDetail");
      let html = "";
      if (node.kind === "hub") {
        if (node.id === "executive") {
          const people = data.leadership.filter(l => ["fx3", "frankIII"].includes(l.id));
          html = `
            <div class="dd-head">
              <div><h2>Executive</h2><div class="dd-leaders">Top leadership, company-wide</div></div>
              <button id="closeCmapDetail">Close ✕</button>
            </div>
            <ul class="ad-func-list">${people.map(p => `<li><strong style="flex:none; min-width:170px;">${p.name}</strong> ${p.title}</li>`).join("")}</ul>
          `;
        } else if (node.id === "corpfn") {
          html = renderGroupDetail();
        } else {
          html = renderDivisionDetail(data.divisions.find(d => d.id === node.id));
        }
      } else {
        const p = data.leadership.find(l => l.id === node.id);
        if (!p) return;
        html = renderPersonDetail(p.name, p.title, p.note);
      }
      panel.innerHTML = html;
      panel.classList.add("show");
      document.getElementById("closeCmapDetail").addEventListener("click", () => panel.classList.remove("show"));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        panel.querySelectorAll(".co-hbar-fill[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
      }));
    }

    const cmapControl = renderConnectionsMap("cmapContainer", { companyData: data, onNodeClick: renderCmapDetail });

    document.getElementById("cmapFullscreen").addEventListener("click", () => {
      const wrap = document.getElementById("cmapWrap");
      if (!document.fullscreenElement) {
        wrap.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const wrap = document.getElementById("cmapWrap");
      const btn = document.getElementById("cmapFullscreen");
      if (!wrap || !btn) return;
      btn.textContent = document.fullscreenElement === wrap ? "✕ Exit fullscreen" : "⛶ Fullscreen";
    });

    document.getElementById("orgmapFullscreen").addEventListener("click", () => {
      const wrap = document.getElementById("orgmapWrap");
      if (!document.fullscreenElement) {
        wrap.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const wrap = document.getElementById("orgmapWrap");
      const btn = document.getElementById("orgmapFullscreen");
      if (!wrap || !btn) return;
      btn.textContent = document.fullscreenElement === wrap ? "✕ Exit fullscreen" : "⛶ Fullscreen";
    });

    const subnavLinks = document.querySelectorAll("#kbSubnav a");
    subnavLinks.forEach(link => {
      link.addEventListener("click", () => {
        subnavLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      });
    });
    const spySections = ["structure", "connections", "cobra"]
      .map(id => document.getElementById("sec-" + id))
      .filter(Boolean);
    if (spySections.length && "IntersectionObserver" in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const secId = entry.target.id.replace("sec-", "");
          subnavLinks.forEach(l => l.classList.toggle("active", l.dataset.sec === secId));
        });
      }, { rootMargin: "-96px 0px -70% 0px", threshold: 0 });
      spySections.forEach(s => spy.observe(s));
    }

    SearchIndex.register("Kelly Benefits", [
      ...data.divisions.map(d => ({ title: `Kelly Benefits ${d.name}`, snippet: d.desc, route: "company" })),
      ...data.leadership.map(p => ({ title: p.name, snippet: p.title, route: "company" }))
    ]);
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

  function updateWorkbenchGate() {
    const gate = document.getElementById("coWbAuthGate");
    const form = document.getElementById("coNoteForm");
    if (!gate || !form) return;
    if (Auth.isSignedIn()) {
      gate.innerHTML = "";
      form.style.display = "";
    } else {
      form.style.display = "none";
      gate.innerHTML = `<div class="auth-gate">Sign in to add or edit workbench items. <button id="coAuthGateBtn">Sign in</button></div>`;
      document.getElementById("coAuthGateBtn").addEventListener("click", () => document.getElementById("authButton").click());
    }
  }

  function wireWorkbench() {
    document.getElementById("coWbFilters").addEventListener("click", (e) => {
      const btn = e.target.closest(".wb-filter");
      if (!btn) return;
      document.querySelectorAll("#coWbFilters .wb-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      wbFilter = btn.dataset.status;
      renderWorkbenchNotes();
    });
    document.getElementById("coNoteAdd").addEventListener("click", async () => {
      const text = document.getElementById("coNoteText").value.trim();
      if (!text) return;
      await supabaseClient.from("workbench_items").insert({
        related: document.getElementById("coNoteRelated").value.trim() || null,
        impact: document.getElementById("coNoteImpact").value,
        effort: document.getElementById("coNoteEffort").value,
        status: "idea",
        body: text
      });
      document.getElementById("coNoteText").value = "";
      document.getElementById("coNoteRelated").value = "";
      renderWorkbenchNotes();
    });
  }

  function renderWorkbenchMatrix(all) {
    const active = all.filter(n => n.status !== "done" && n.status !== "shelved");
    const impacts = ["high", "med", "low"];
    const efforts = ["low", "med", "high"];
    const cells = impacts.map(imp => efforts.map(eff => {
      const items = active.filter(n => n.impact === imp && n.effort === eff);
      let cls = "", label = "";
      if (imp === "high" && eff === "low") { cls = "best"; label = "Do first"; }
      if (imp === "low" && eff === "high") { cls = "worst"; label = "Reconsider"; }
      return `<div class="wb-cell ${cls}">
        ${label ? `<span class="wb-cell-label">${label}</span>` : ""}
        ${items.map(it => `<div class="wb-chip" data-id="${it.id}" title="${it.body.replace(/"/g, "&quot;")}">${it.body.length > 34 ? it.body.slice(0, 34) + "…" : it.body}</div>`).join("")}
      </div>`;
    }).join("")).join("");
    document.getElementById("coWbMatrix").innerHTML = cells;
    document.querySelectorAll("#coWbMatrix .wb-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const el = document.querySelector(`#coNotesList .note-item[data-id="${chip.dataset.id}"]`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.borderColor = "var(--accent)"; setTimeout(() => el.style.borderColor = "", 1200); }
      });
    });
  }

  async function renderWorkbenchNotes() {
    const list = document.getElementById("coNotesList");
    if (!list) return;
    const { data, error } = await supabaseClient.from("workbench_items").select("*").order("created_at", { ascending: false });
    if (!document.getElementById("coNotesList")) return;
    if (error) { list.innerHTML = `<div style="color:var(--warn);">Couldn't load workbench items (${error.message}).</div>`; return; }
    renderWorkbenchMatrix(data);
    const filtered = wbFilter === "all" ? data
      : wbFilter === "done" ? data.filter(n => n.status === "done" || n.status === "shelved")
      : data.filter(n => n.status === wbFilter);
    if (!filtered.length) { list.innerHTML = `<div class="notes-empty">Nothing here yet.</div>`; return; }
    const signedIn = Auth.isSignedIn();
    list.innerHTML = filtered.map(n => `
      <div class="note-item" data-id="${n.id}">
        ${signedIn ? `<button class="note-del" title="Delete" data-id="${n.id}">✕</button>` : ""}
        <div class="nmeta">
          <span class="note-tag impact-${n.impact}">${IMPACT_LABEL[n.impact]}</span>
          <span class="note-tag effort">${EFFORT_LABEL[n.effort]}</span>
          ${n.related ? `<span class="note-related">${n.related}</span>` : ""}
          <span class="note-date mono">${n.created_at.slice(0, 10)}</span>
        </div>
        <div class="note-text">${n.body}</div>
        <div class="note-status-row">
          ${signedIn ? `
            <label style="font-size:0.72rem; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.04em;">Status</label>
            <select data-id="${n.id}" class="wb-status-select">
              ${STATUS_ORDER.map(s => `<option value="${s}" ${s === n.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
            </select>
          ` : `<span class="note-tag">${STATUS_LABEL[n.status]}</span>`}
        </div>
      </div>`).join("");
    if (signedIn) {
      list.querySelectorAll(".note-del").forEach(btn => {
        btn.addEventListener("click", async () => {
          await supabaseClient.from("workbench_items").delete().eq("id", btn.dataset.id);
          renderWorkbenchNotes();
        });
      });
      list.querySelectorAll(".wb-status-select").forEach(sel => {
        sel.addEventListener("change", async () => {
          await supabaseClient.from("workbench_items").update({ status: sel.value }).eq("id", sel.dataset.id);
          renderWorkbenchNotes();
        });
      });
    }
  }

  Router.register("company", renderCompanyView);
})();
