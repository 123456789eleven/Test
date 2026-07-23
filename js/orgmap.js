(function () {
  const EXEC_IDS = ["fx3", "frankIII"];
  const svgNS = "http://www.w3.org/2000/svg";

  // One color per vertical, grouped by division family. Advantage's five were the original,
  // user-confirmed set — left unchanged. The other three divisions' verticals are new (see
  // company.json's verticalsNote) and use their division's existing hub color as a family.
  const VERTICAL_COLORS = {
    win: "#6366f1", construct: "#06b6d4", protect: "#d97706", connect: "#059669", serve: "#e11d48",
    "strat-new": "#3b82f6", "strat-design": "#2563eb", "strat-service": "#60a5fa", "strat-comply": "#1d4ed8",
    "pay-setup": "#06b6d4", "pay-process": "#0891b2", "pay-tax": "#22d3ee", "pay-support": "#0e7490",
    "adv-consult": "#8b5cf6", "adv-research": "#7c3aed", "adv-participant": "#a78bfa", "adv-comply": "#6d28d9"
  };
  window.VERTICAL_COLORS = VERTICAL_COLORS;

  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }
  function initials(name) {
    const words = name.replace(/^The Honorable\s+/, "").split(/\s+/).filter(w => /^[A-Z]/.test(w));
    return (words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "");
  }

  function renderPeopleList(people) {
    if (!people || !people.length) return "";
    return `
      <ul class="ocn-people">
        ${people.map(p => `
          <li>
            <button class="ocn-person" data-id="${escAttr(p.id)}" data-cross="${escAttr((p.cross || []).join(","))}" title="${escAttr(p.name)} — ${escAttr(p.title)}">
              <span class="ocn-avatar">${initials(p.name)}</span>
              <span class="ocn-person-info">
                <span class="ocn-person-name">${p.name}</span>
                <span class="ocn-person-title">${p.title}</span>
              </span>
              ${p.cross && p.cross.length ? '<span class="ocn-cross-dot" title="Also connects to another division — click to see"></span>' : ""}
            </button>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function renderBox(node) {
    const statusClass = node.type === "function" ? (node.confirmed ? " ocn-confirmed" : " ocn-estimated") : "";
    const collapsible = (node.type === "vertical" || node.type === "division") && node.children && node.children.length;
    const accentStyle = (node.accentColor && !node.seat) ? ` style="border-top-color:${node.accentColor}; border-top-width:3px;"` : "";
    return `
      <div class="ocn ocn-${node.type}${node.seat ? " ocn-seat" : ""}${statusClass}${collapsible ? " oc-toggle" : ""}" data-id="${escAttr(node.id)}" tabindex="0" role="button"${accentStyle}>
        <div class="ocn-name">${node.name}${collapsible ? '<span class="ocn-chevron">▸</span>' : ""}${node.linked ? '<span class="ocn-link-dot" title="Connects to other functions">🔗</span>' : ""}${node.reach ? '<span class="ocn-reach-dot" title="Connects to all four divisions — click to see">◈</span>' : ""}</div>
        ${node.role ? `<div class="ocn-role">${node.role}</div>` : ""}
        ${renderPeopleList(node.people)}
        ${node.seat ? '<div class="ocn-seat-badge">YOU ARE HERE</div>' : ""}
      </div>
    `;
  }

  function buildTree(companyData) {
    const leadership = companyData.leadership;
    const byDivision = (divId) => leadership.filter(l => l.parent === divId);
    const corpPeople = leadership.filter(l => l.parent === "root" && !EXEC_IDS.includes(l.id));
    const execPeople = leadership.filter(l => EXEC_IDS.includes(l.id));
    const connections = companyData.processConnections || [];
    const connectedIds = new Set();
    connections.forEach(c => { connectedIds.add(c.from); connectedIds.add(c.to); });

    const allVerticals = Object.entries(companyData.verticals || {});
    const divisionNodes = companyData.divisions.map(d => {
      const node = {
        id: d.id, type: "division", name: d.name, role: d.role,
        people: byDivision(d.id)
      };
      const ownVerticals = allVerticals.filter(([, v]) => v.division === d.id);
      if (ownVerticals.length) {
        node.children = ownVerticals.map(([key, v]) => ({
          id: key, type: "vertical", name: v.name,
          role: v.confirmed ? "Confirmed" : "Estimated — verify",
          seat: key === "connect",
          people: [], accentColor: VERTICAL_COLORS[key],
          children: v.funcs.map(f => ({
            id: f.id, type: "function", name: f.label,
            role: f.confirmed ? "Confirmed" : "Estimated", confirmed: f.confirmed,
            linked: connectedIds.has(f.id), accentColor: VERTICAL_COLORS[key]
          }))
        }));
      }
      return node;
    });

    const corpNode = {
      id: "corpfn", type: "group", name: "Corporate Functions", role: "Shared services, all divisions",
      reach: true, people: corpPeople
    };

    return {
      id: "root", type: "root", name: "Kelly Benefits",
      people: execPeople,
      children: [...divisionNodes, corpNode]
    };
  }

  function renderNode(node) {
    const children = node.children || [];
    const listClass = (node.type === "vertical" || node.type === "division") && children.length ? " oc-fn-list" : "";
    const childrenHtml = children.length
      ? `<ul class="${listClass}">${children.map(c => `<li>${renderNode(c)}</li>`).join("")}</ul>`
      : "";
    return renderBox(node) + childrenHtml;
  }

  window.renderOrgMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const tree = buildTree(companyData);
    container.innerHTML = `<ul class="orgchart"><li>${renderNode(tree)}</li></ul>`;
    container.style.position = "relative";

    // Pre-expand this project's own seat (Advantage → Connect) so it's visible without clicking;
    // the other three divisions' department breakdowns are new/estimated, so they start collapsed.
    ["advantage", "connect"].forEach(id => {
      const toggle = container.querySelector(`.oc-toggle[data-id="${id}"]`);
      const list = toggle && toggle.nextElementSibling;
      if (toggle && list) { toggle.classList.add("oc-expanded"); list.classList.add("oc-expanded"); }
    });

    const overlay = document.createElementNS(svgNS, "svg");
    overlay.setAttribute("class", "ocn-overlay");
    container.appendChild(overlay);

    const divisionIds = companyData.divisions.map(d => d.id);
    const funcToVertical = {};
    Object.entries(companyData.verticals || {}).forEach(([vKey, v]) => {
      (v.funcs || []).forEach(f => { funcToVertical[f.id] = vKey; });
    });
    let activeMode = null; // { kind: "person"|"function", id } | { kind: "corpfn" } | { kind: "all" }

    function expandVertical(vKey) {
      const toggle = container.querySelector(`.oc-toggle[data-id="${CSS.escape(vKey)}"]`);
      const list = toggle && toggle.nextElementSibling;
      if (toggle && list && !list.classList.contains("oc-expanded")) {
        toggle.classList.add("oc-expanded");
        list.classList.add("oc-expanded");
      }
    }

    function nodeCenter(id) {
      const el = container.querySelector(`.ocn[data-id="${CSS.escape(id)}"], .ocn-person[data-id="${CSS.escape(id)}"]`);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const wrap = container.getBoundingClientRect();
      return {
        x: box.left - wrap.left + container.scrollLeft + box.width / 2,
        y: box.top - wrap.top + container.scrollTop + box.height / 2
      };
    }

    function drawLines(pairs) {
      overlay.setAttribute("width", container.scrollWidth);
      overlay.setAttribute("height", container.scrollHeight);
      overlay.innerHTML = "";
      pairs.forEach(([fromId, toId]) => {
        const a = nodeCenter(fromId), b = nodeCenter(toId);
        if (!a || !b) return;
        const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 46;
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`);
        path.setAttribute("class", "ocn-overlay-line");
        overlay.appendChild(path);
        [a, b].forEach(pt => {
          const dot = document.createElementNS(svgNS, "circle");
          dot.setAttribute("cx", pt.x.toFixed(1)); dot.setAttribute("cy", pt.y.toFixed(1)); dot.setAttribute("r", 4);
          dot.setAttribute("class", "ocn-overlay-dot");
          overlay.appendChild(dot);
        });
      });
    }

    function pairsAndHighlightForMode(mode) {
      if (mode.kind === "person") {
        const person = companyData.leadership.find(l => l.id === mode.id);
        if (!person) return { pairs: [], ids: [] };
        return {
          pairs: (person.cross || []).map(divId => [person.id, divId]),
          ids: [person.id, person.parent, ...(person.cross || [])]
        };
      }
      if (mode.kind === "corpfn") {
        return { pairs: divisionIds.map(divId => ["corpfn", divId]), ids: ["corpfn", ...divisionIds] };
      }
      if (mode.kind === "function") {
        const conns = (companyData.processConnections || []).filter(c => c.from === mode.id || c.to === mode.id);
        const ids = [mode.id];
        const pairs = conns.map(c => {
          ids.push(c.from === mode.id ? c.to : c.from);
          return [c.from, c.to];
        });
        return { pairs, ids };
      }
      // "all"
      const pairs = [];
      companyData.leadership.forEach(p => { (p.cross || []).forEach(divId => pairs.push([p.id, divId])); });
      divisionIds.forEach(divId => pairs.push(["corpfn", divId]));
      (companyData.processConnections || []).forEach(c => pairs.push([c.from, c.to]));
      return { pairs, ids: [] };
    }

    function clearLines() {
      activeMode = null;
      overlay.innerHTML = "";
      container.querySelectorAll(".ocn-active").forEach(el => el.classList.remove("ocn-active"));
    }

    function highlight(ids) {
      container.querySelectorAll(".ocn-active").forEach(el => el.classList.remove("ocn-active"));
      ids.forEach(id => {
        const el = container.querySelector(`.ocn[data-id="${CSS.escape(id)}"], .ocn-person[data-id="${CSS.escape(id)}"]`);
        if (el) el.classList.add("ocn-active");
      });
    }

    function activate(mode) {
      if (activeMode && activeMode.kind === mode.kind && activeMode.id === mode.id) { clearLines(); return; }
      activeMode = mode;
      const { pairs, ids } = pairsAndHighlightForMode(mode);
      drawLines(pairs);
      highlight(ids);
    }

    function showPersonConnections(person) { activate({ kind: "person", id: person.id }); }
    function showCorpfnReach() { activate({ kind: "corpfn" }); }

    function showFunctionConnections(id) {
      const conns = (companyData.processConnections || []).filter(c => c.from === id || c.to === id);
      if (!conns.length) return;
      const relatedIds = new Set([id]);
      conns.forEach(c => { relatedIds.add(c.from); relatedIds.add(c.to); });
      relatedIds.forEach(fid => { const vKey = funcToVertical[fid]; if (vKey) expandVertical(vKey); });
      requestAnimationFrame(() => activate({ kind: "function", id }));
    }

    function showAllConnections() {
      const allFuncIds = new Set();
      (companyData.processConnections || []).forEach(c => { allFuncIds.add(c.from); allFuncIds.add(c.to); });
      allFuncIds.forEach(fid => { const vKey = funcToVertical[fid]; if (vKey) expandVertical(vKey); });
      requestAnimationFrame(() => activate({ kind: "all" }));
    }

    function redrawActive() {
      if (!activeMode) return;
      const { pairs, ids } = pairsAndHighlightForMode(activeMode);
      drawLines(pairs);
      highlight(ids);
    }

    window.addEventListener("resize", redrawActive);

    function handleActivate(el) {
      if (onNodeClick) onNodeClick(el.dataset.id);
      if (el.classList.contains("oc-toggle")) {
        const ul = el.nextElementSibling;
        if (ul) ul.classList.toggle("oc-expanded");
        el.classList.toggle("oc-expanded");
        requestAnimationFrame(redrawActive);
      }
      if (el.dataset.id === "corpfn") showCorpfnReach();
      if (el.classList.contains("ocn-function")) showFunctionConnections(el.dataset.id);
    }
    container.querySelectorAll(".ocn").forEach(el => {
      el.addEventListener("click", () => handleActivate(el));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(el); }
      });
    });

    container.querySelectorAll(".ocn-person").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (onNodeClick) onNodeClick(id);
        const person = companyData.leadership.find(l => l.id === id);
        if (person && person.cross && person.cross.length) showPersonConnections(person);
      });
      btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); });
    });

    return { showAllConnections, clearLines, redraw: redrawActive };
  };
})();
