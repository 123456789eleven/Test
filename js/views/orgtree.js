(function () {
  function fmtVal(v) { return v === null ? "n/a" : "$" + v + "B"; }

  // Own data fetch, deliberately not shared with fullcircle.js — see PLAN.md.
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

  async function renderOrgTreeView(mount) {
    mount.innerHTML = `
      <div class="page-head">
        <h1>Kelly Benefits — Org Tree</h1>
        <p>Strict reporting structure — who reports to whom, and which job functions sit where. For how the divisions actually connect and function as a whole, see <a href="#/full-circle">Full Circle</a> instead.</p>
      </div>

      <div class="snapshot" id="otSnapshot"></div>

      <div class="orgmap-wrap" id="orgmapWrap">
        <div class="orgmap-head">
          <p class="cap">The real reporting structure: every division's departments and job functions. Click a division's ▸ to expand into its departments, then again into individual job functions — Advantage's are the most refined since that's this project's own seat; Strategies', Payroll's, and Advisory's are a standard-industry-pattern estimate, marked as such. A 🔗 means a function connects to others in the workflow (see Full Circle for the relationship view). Click any person with a <span class="ocn-cross-dot" style="display:inline-block; vertical-align:middle;"></span> mark to trace who they connect to outside their own division. Click Corporate Functions (◈) to see its reach across all four.</p>
          <div style="display:flex; gap:8px; flex:none; flex-wrap:wrap;">
            <button id="orgAddPerson" class="orgmap-fs-btn" style="display:none;">+ Add person</button>
            <button id="orgmapShowAll" class="orgmap-connect-btn">🔗 Show all connections</button>
            <button id="orgmapFullscreen" class="orgmap-fs-btn">⛶ Fullscreen</button>
          </div>
        </div>
        <p class="orgmap-live-note" id="orgLiveNote"></p>
        <div id="coOrgMap" class="orgmap-container"></div>
        <p class="orgmap-caption">Workflow within Advantage: Win → Construct → then splits into Protect, Connect, and Serve. Construct, Connect, and Serve also share enrollment responsibility.</p>
      </div>

      <div id="orgDetail"></div>

      <p class="section-label">Leadership — split across the four divisions</p>
      <div class="leadership" id="otLeadership"></div>

      <div class="timeline-card">
        <h3>Company history</h3>
        <p class="cap">50 years from a bedroom in Maryland to four connected divisions — the growth pattern (family stability, then acquisition, then outside technology leadership) tells its own story.</p>
        <div class="timeline" id="otHistoryTimeline"></div>
      </div>
    `;

    await Auth.ready;

    const onAuthOrMigrate = () => {
      if (!document.getElementById(mount.id)) {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
        return;
      }
      updateOrgEditGate();
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

    let data = { snapshot: staticData.snapshot, history: staticData.history };
    let orgDataLive = true;
    try {
      Object.assign(data, await loadOrgData());
    } catch (err) {
      console.error("Live org data unavailable, showing last saved structure:", err);
      orgDataLive = false;
      const note = document.getElementById("orgLiveNote");
      if (note) note.textContent = "Showing the last saved structure — live editing is unavailable right now.";
      Object.assign(data, {
        divisions: staticData.divisions, verticals: staticData.verticals,
        leadership: staticData.leadership, processConnections: staticData.processConnections
      });
    }

    const heroCovered = ["Founded", "Scale", "Recognition"];
    document.getElementById("otSnapshot").innerHTML = data.snapshot.filter(s => !heroCovered.includes(s.l)).map(s => `
      <div class="snap-card"><div class="l">${s.l}</div><div class="v">${s.v}</div></div>`).join("");

    document.getElementById("otLeadership").innerHTML = data.leadership.map(p => `
      <div class="leader-card"><div class="name">${p.name}</div><div class="title">${p.title}</div><div class="note">${p.note}</div></div>`).join("");

    document.getElementById("otHistoryTimeline").innerHTML = data.history.map(h => `
      <div class="tl-item">
        <div class="tl-date mono">${h.date}</div>
        <div class="tl-deal">${h.deal}${h.value ? ` <span class="mono" style="font-weight:400; color:var(--ink-muted); font-size:0.8rem;">— ${h.value}</span>` : ""}</div>
        <div class="tl-sig">${h.sig}</div>
      </div>`).join("");

    function canEditOrg() { return Auth.isSignedIn() && orgDataLive; }
    function oeEditBtn(kind, id) {
      if (!canEditOrg()) return "";
      return `<button class="orgedit-btn" data-oe-action="edit" data-oe-kind="${kind}" data-oe-id="${id}">✎ Edit</button>`;
    }
    function oeDeleteBtn(kind, id) {
      if (!canEditOrg()) return "";
      return `<button class="orgedit-btn orgedit-btn-danger" data-oe-action="delete" data-oe-kind="${kind}" data-oe-id="${id}">🗑 Delete</button>`;
    }
    function oeAddBtn(kind, label, parentId) {
      if (!canEditOrg()) return "";
      return `<button class="orgedit-btn" data-oe-action="add" data-oe-kind="${kind}" data-oe-parent="${parentId}">+ ${label}</button>`;
    }

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
        <div class="orgedit-row">${oeEditBtn("division", d.id)}${oeAddBtn("vertical", "Add department", d.id)}</div>
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
        ${key === "connect" ? `<a href="#/full-circle" class="fn-conn-link" style="margin-top:12px;">→ See the full COBRA process and how this connects, on Full Circle</a>` : ""}
        <div class="orgedit-row">${oeEditBtn("vertical", key)}${oeAddBtn("function", "Add job function", key)}${oeDeleteBtn("vertical", key)}</div>
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
        ${!feedsInto.length && !fedBy.length && !shared.length ? '<p class="notes-empty">No modeled connections yet for this function — see Full Circle.</p>' : ""}
        <div class="orgedit-row">${oeEditBtn("function", id)}${oeDeleteBtn("function", id)}</div>
      `;
    }

    function renderPersonDetail(id, name, title, note) {
      return `
        <div class="dd-head">
          <div><h2>${name}</h2><div class="dd-leaders">${title}</div></div>
          <button id="closeOrgDetail">Close ✕</button>
        </div>
        ${note ? `<p class="desc">${note}</p>` : ""}
        <div class="orgedit-row">${oeEditBtn("person", id)}${oeDeleteBtn("person", id)}</div>
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
        <div class="orgedit-row">${oeAddBtn("person", "Add person", "root")}</div>
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
        html = renderPersonDetail(p.id, p.name, p.title, p.note);
      } else {
        const p = data.leadership.find(l => l.id === id);
        if (!p) return false;
        html = renderPersonDetail(p.id, p.name, p.title, p.note);
      }
      panel.innerHTML = html;
      panel.classList.add("show");
      document.getElementById("closeOrgDetail").addEventListener("click", () => panel.classList.remove("show"));
      panel.querySelectorAll(".fn-conn-link[data-jump]").forEach(btn => {
        btn.addEventListener("click", () => jumpToNode(btn.dataset.jump));
      });
      panel.querySelectorAll("[data-oe-action]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const { oeAction, oeKind, oeId, oeParent } = btn.dataset;
          if (oeAction === "delete") { OrgEdit.remove(oeKind, oeId); return; }
          OrgEdit.open(oeKind, oeAction, oeId, oeParent);
        });
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

    let orgMapControl = renderOrgMap("coOrgMap", { companyData: data, onNodeClick: handleOrgNodeClick });

    function updateOrgEditGate() {
      const addPersonBtn = document.getElementById("orgAddPerson");
      if (addPersonBtn) addPersonBtn.style.display = canEditOrg() ? "" : "none";
    }
    updateOrgEditGate();

    async function refreshOrgMap() {
      try {
        Object.assign(data, await loadOrgData());
        orgDataLive = true;
        document.getElementById("orgLiveNote").textContent = "";
      } catch (err) {
        console.error("Failed to refresh org data:", err);
        orgDataLive = false;
        document.getElementById("orgLiveNote").textContent = "Showing the last saved structure — live editing is unavailable right now.";
      }
      updateOrgEditGate();
      if (orgMapControl) orgMapControl.destroy();
      orgMapControl = renderOrgMap("coOrgMap", { companyData: data, onNodeClick: handleOrgNodeClick });
      document.getElementById("otLeadership").innerHTML = data.leadership.map(p => `
        <div class="leader-card"><div class="name">${p.name}</div><div class="title">${p.title}</div><div class="note">${p.note}</div></div>`).join("");
      document.getElementById("orgDetail").classList.remove("show");
    }
    OrgEdit.init(() => data, refreshOrgMap);

    document.getElementById("orgAddPerson").addEventListener("click", () => OrgEdit.open("person", "add", null, "root"));

    document.getElementById("orgmapShowAll").addEventListener("click", (e) => {
      orgMapControl.showAllConnections();
      e.target.classList.toggle("on");
    });

    document.getElementById("orgmapFullscreen").addEventListener("click", () => {
      const wrap = document.getElementById("orgmapWrap");
      if (!document.fullscreenElement) {
        wrap.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    function fitOrgMapToScreen() {
      const wrap = document.getElementById("orgmapWrap");
      const container = document.getElementById("coOrgMap");
      const tree = container && container.querySelector(".orgchart");
      if (!wrap || !container || !tree) return;
      if (document.fullscreenElement === wrap) {
        tree.style.transform = "none";
        const availW = container.clientWidth, availH = container.clientHeight;
        const naturalW = tree.scrollWidth, naturalH = tree.scrollHeight;
        const scale = Math.min(availW / naturalW, availH / naturalH, 1);
        tree.style.transformOrigin = "top center";
        tree.style.transform = `scale(${scale.toFixed(3)})`;
      } else {
        tree.style.transform = "none";
      }
    }
    document.addEventListener("fullscreenchange", () => {
      const wrap = document.getElementById("orgmapWrap");
      const btn = document.getElementById("orgmapFullscreen");
      if (!wrap || !btn) return;
      btn.textContent = document.fullscreenElement === wrap ? "✕ Exit fullscreen" : "⛶ Fullscreen";
      requestAnimationFrame(() => requestAnimationFrame(fitOrgMapToScreen));
    });

    SearchIndex.register("Org Tree", [
      ...data.divisions.map(d => ({ title: `Kelly Benefits ${d.name}`, snippet: d.desc, route: "org-tree" })),
      ...data.leadership.map(p => ({ title: p.name, snippet: p.title, route: "org-tree" }))
    ]);
  }

  Router.register("org-tree", renderOrgTreeView);
})();
