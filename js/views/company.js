(function () {
  const STATUS_LABEL = { idea: "Idea", considering: "Considering", proposed: "Proposed", active: "Active", done: "Done", shelved: "Shelved" };
  const STATUS_ORDER = ["idea", "considering", "proposed", "active", "done", "shelved"];
  const IMPACT_LABEL = { high: "High impact", med: "Medium impact", low: "Low impact" };
  const EFFORT_LABEL = { low: "Low effort", med: "Medium effort", high: "High effort" };

  let wbFilter = "all";
  let openDivisionId = null;
  let fitSaveTimeout;

  function fmtVal(v) { return v === null ? "n/a" : "$" + v + "B"; }

  async function renderCompanyView(mount) {
    mount.innerHTML = `
      <div class="page-head">
        <h1>Kelly Benefits — The Full Circle</h1>
        <p>A privately-held, family-owned benefits company built around four connected divisions — each one sells into (or draws from) the next, forming a closed loop of the client relationship rather than a single-service business.</p>
      </div>

      <div class="fit-box">
        <div class="lbl">Where I fit</div>
        <textarea id="fitText" placeholder="e.g. I work in COBRA administration within Kelly Benefits Advantage, handling..."></textarea>
        <div class="hint" id="fitHint">Ground the rest of this page in your actual seat — it changes what "moving up" should mean.</div>
      </div>

      <div class="tabs" id="coTabs">
        <button data-view="overview" class="active">Overview</button>
        <button data-view="advantage">Inside Advantage</button>
        <button data-view="people">People &amp; History</button>
        <button data-view="strategy">Strategy</button>
        <button data-view="notes">Workbench</button>
      </div>

      <div class="view active" id="coview-overview">
        <div class="snapshot" id="coSnapshot"></div>

        <div class="circle-wrap">
          <div class="circle-diagram" id="circleDiagram">
            <svg class="lines" viewBox="0 0 600 600">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-muted)" opacity="0.7"/></marker>
              </defs>
              <path d="M 300 130 A 170 170 0 0 1 470 300" marker-end="url(#arrowhead)"></path>
              <path d="M 470 300 A 170 170 0 0 1 300 470" marker-end="url(#arrowhead)"></path>
              <path d="M 300 470 A 170 170 0 0 1 130 300" marker-end="url(#arrowhead)"></path>
              <path d="M 130 300 A 170 170 0 0 1 300 130" marker-end="url(#arrowhead)"></path>
            </svg>
            <div class="circle-center"><b>One client relationship</b>Sold, administered, paid, and invested — through a shared Total Benefits Solution® platform.</div>
          </div>
        </div>

        <div id="divisionDetail">
          <div class="dd-head">
            <div><h2 id="ddTitle"></h2></div>
            <button id="closeDivision">Close ✕</button>
          </div>
          <p class="desc" id="ddDesc"></p>
          <div class="scale-note" id="ddScale"></div>
          <div id="ddChart"></div>
          <div class="chart-caption" id="ddCaption"></div>
        </div>

        <div class="integration-box" id="coIntegrationNote"></div>
      </div>

      <div class="view" id="coview-advantage">
        <p class="adv-intro">Kelly Benefits Advantage itself is organized into five verticals. This is a working model built from what's confirmed on the ground, not public research — click any vertical for what's actually known versus what's still a guess.</p>
        <div class="vf-flow">
          <div class="vf-row">
            <div class="vf-node" data-v="win" tabindex="0" role="button"><div class="vf-name">Win</div><div class="vf-func">New business</div></div>
            <div class="vf-arrow">→</div>
            <div class="vf-node" data-v="construct" tabindex="0" role="button"><div class="vf-name">Construct</div><div class="vf-func">Implementation &amp; integration</div></div>
          </div>
          <div class="vf-split-label">then splits into three ongoing tracks ↓</div>
          <div class="vf-row three">
            <div class="vf-node" data-v="protect" tabindex="0" role="button"><div class="vf-name">Protect</div><div class="vf-func">Compliance &amp; broker mgmt (unconfirmed)</div></div>
            <div class="vf-node seat" data-v="connect" tabindex="0" role="button"><div class="vf-name">Connect</div><div class="vf-func">COBRA admin</div><span class="vf-seat-badge">You are here</span></div>
            <div class="vf-node" data-v="serve" tabindex="0" role="button"><div class="vf-name">Serve</div><div class="vf-func">Dedicated service</div></div>
          </div>
        </div>

        <div id="advDetail">
          <div class="ad-head">
            <h3 id="advTitle"></h3>
            <span class="ad-status" id="advStatus"></span>
            <button id="closeAdv">Close ✕</button>
          </div>
          <p id="advDesc" style="color:var(--ink-soft); font-size:0.9rem; margin-top:4px;"></p>
          <ul class="ad-func-list" id="advFuncs"></ul>
        </div>

        <div class="crosscutting-box">
          <h4>Where "enrollment" and "reconciliation" actually sit</h4>
          <p id="coEnrollmentNote"></p>
          <p id="coReconciliationNote"></p>
        </div>
      </div>

      <div class="view" id="coview-people">
        <p class="section-label">Leadership — split along the same circle</p>
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

    document.getElementById("coSnapshot").innerHTML = data.snapshot.map(s => `
      <div class="snap-card"><div class="l">${s.l}</div><div class="v">${s.v}</div></div>`).join("");

    document.getElementById("coLeadership").innerHTML = data.leadership.map(p => `
      <div class="leader-card"><div class="name">${p.name}</div><div class="title">${p.title}</div><div class="note">${p.note}</div></div>`).join("");

    document.getElementById("coHistoryTimeline").innerHTML = data.history.map(h => `
      <div class="tl-item">
        <div class="tl-date mono">${h.date}</div>
        <div class="tl-deal">${h.deal}${h.value ? ` <span class="mono" style="font-weight:400; color:var(--ink-muted); font-size:0.8rem;">— ${h.value}</span>` : ""}</div>
        <div class="tl-sig">${h.sig}</div>
      </div>`).join("");

    document.getElementById("coIntegrationNote").innerHTML = `<b>${data.integrationNote.split(" — ")[0]} —</b> ${data.integrationNote.split(" — ").slice(1).join(" — ")}`;

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

    const diagram = document.getElementById("circleDiagram");
    function renderCircle() {
      diagram.querySelectorAll(".division-node").forEach(el => el.remove());
      data.divisions.forEach(d => {
        const el = document.createElement("div");
        el.className = "division-node" + (openDivisionId === d.id ? " open" : "");
        el.style.left = (d.x / 600 * 100) + "%";
        el.style.top = (d.y / 600 * 100) + "%";
        el.innerHTML = `<div class="node-circle">${d.name}</div><div class="node-sub">${d.role}</div>`;
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${d.name} — ${d.role}`);
        el.addEventListener("click", () => openDivision(d.id));
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDivision(d.id); } });
        diagram.appendChild(el);
      });
    }

    function openDivision(id) {
      if (openDivisionId === id) { closeDivision(); return; }
      openDivisionId = id;
      renderCircle();
      const d = data.divisions.find(x => x.id === id);
      document.getElementById("ddTitle").textContent = `Kelly Benefits ${d.name} — ${d.role}`;
      document.getElementById("ddDesc").textContent = d.desc;
      document.getElementById("ddScale").innerHTML = d.scale;
      document.getElementById("ddCaption").textContent = d.caption;

      const withVals = d.competitors.filter(c => c.value !== null);
      const max = Math.max(...withVals.map(c => c.value));
      const chartHtml = d.competitors.map(c => `
        <div class="co-hbar-row">
          <div class="lbl">${c.name}${c.note ? `<span class="sub">${c.note}</span>` : ""}</div>
          <div class="co-hbar-track">${c.value !== null ? `<div class="co-hbar-fill ${c.kelly ? "kelly" : ""}" data-w="${(c.value / max) * 100}"></div>` : ""}</div>
          <div class="val mono">${fmtVal(c.value)}</div>
        </div>
      `).join("");
      document.getElementById("ddChart").innerHTML = `<div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-soft); margin-bottom:10px;">${d.unit}</div>` + chartHtml;

      document.getElementById("divisionDetail").classList.add("show");
      document.getElementById("divisionDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll("#ddChart .co-hbar-fill[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
      }));
    }
    function closeDivision() { openDivisionId = null; renderCircle(); document.getElementById("divisionDetail").classList.remove("show"); }
    document.getElementById("closeDivision").addEventListener("click", closeDivision);
    renderCircle();

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".circle-diagram svg.lines path").forEach((path, i) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.getBoundingClientRect();
        path.style.transition = `stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s`;
        requestAnimationFrame(() => { path.style.strokeDashoffset = 0; });
      });
      document.querySelectorAll(".division-node").forEach((el, i) => {
        el.style.opacity = 0;
        el.style.transition = `opacity .5s ease ${0.3 + i * 0.08}s`;
        requestAnimationFrame(() => { el.style.opacity = 1; });
      });
    }

    function openVertical(id) {
      const v = data.verticals[id];
      document.querySelectorAll(".vf-node").forEach(n => n.classList.toggle("open", n.dataset.v === id));
      document.getElementById("advTitle").textContent = v.name;
      const statusEl = document.getElementById("advStatus");
      statusEl.textContent = v.confirmed ? "Confirmed" : "Estimated — verify";
      statusEl.className = "ad-status " + (v.confirmed ? "confirmed" : "unconfirmed");
      document.getElementById("advDesc").textContent = v.desc;
      document.getElementById("advFuncs").innerHTML = v.funcs.map(([label, confirmed]) => `
        <li><span class="ad-pill ${confirmed ? "confirmed" : "estimated"}">${confirmed ? "confirmed" : "est."}</span> ${label}</li>
      `).join("");
      document.getElementById("advDetail").classList.add("show");
      document.getElementById("advDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    document.querySelectorAll(".vf-node").forEach(node => {
      node.addEventListener("click", () => openVertical(node.dataset.v));
      node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVertical(node.dataset.v); } });
    });
    document.getElementById("closeAdv").addEventListener("click", () => {
      document.getElementById("advDetail").classList.remove("show");
      document.querySelectorAll(".vf-node").forEach(n => n.classList.remove("open"));
    });

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
