(function () {
  const svgNS = "http://www.w3.org/2000/svg";
  const DIVISION_ORDER = ["strategies", "advantage", "payroll", "advisory"];

  function findVerticalOf(functionId, verticals) {
    for (const [vid, v] of Object.entries(verticals)) {
      if (v.funcs.some(f => f.id === functionId)) return vid;
    }
    return null;
  }

  // Roll up function-level org_connections rows to deduplicated vertical (department) pairs.
  // A pair renders directional (arrow) only if every underlying row agrees on both type and
  // direction; any disagreement (mixed handoff/shared, or handoff rows pointing both ways)
  // collapses it to an undirected pair, since a one-way arrow would misrepresent it.
  function aggregateConnections(processConnections, verticals) {
    const pairs = new Map();
    (processConnections || []).forEach(c => {
      const fromV = findVerticalOf(c.from, verticals);
      const toV = findVerticalOf(c.to, verticals);
      if (!fromV || !toV || fromV === toV) return;
      const key = [fromV, toV].sort().join("|");
      if (!pairs.has(key)) pairs.set(key, { a: key.split("|")[0], b: key.split("|")[1], rows: [] });
      pairs.get(key).rows.push(c);
    });
    return Array.from(pairs.values()).map(p => {
      const types = new Set(p.rows.map(r => r.type));
      const dirs = new Set(p.rows.map(r => findVerticalOf(r.from, verticals) + "->" + findVerticalOf(r.to, verticals)));
      const unanimous = types.size === 1 && !types.has("shared") && dirs.size === 1;
      let direction = null;
      if (unanimous) {
        const [row] = p.rows;
        direction = { from: findVerticalOf(row.from, verticals), to: findVerticalOf(row.to, verticals) };
      }
      return { a: p.a, b: p.b, rows: p.rows, directed: unanimous, direction };
    });
  }

  function crossDivisionEdges(leadership, divisions) {
    const edges = [];
    (leadership || []).forEach(p => {
      (p.cross || []).forEach(divId => {
        if (p.parent && divisions.some(d => d.id === divId) && divisions.some(d => d.id === p.parent)) {
          edges.push({ kind: "person", from: p.parent, to: divId, label: p.name });
        }
      });
    });
    divisions.forEach(d => edges.push({ kind: "corpfn", from: "corpfn", to: d.id, label: "Corporate Functions" }));
    return edges;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.renderConnectionMap = function (containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const verticals = data.verticals || {};
    const divisions = DIVISION_ORDER.map(id => (data.divisions || []).find(d => d.id === id)).filter(Boolean);
    const verticalsByDivision = {};
    divisions.forEach(d => { verticalsByDivision[d.id] = Object.entries(verticals).filter(([, v]) => v.division === d.id).map(([id, v]) => ({ id, ...v })); });

    const pairs = aggregateConnections(data.processConnections, verticals);
    const connectedVerticalIds = new Set();
    pairs.forEach(p => { connectedVerticalIds.add(p.a); connectedVerticalIds.add(p.b); });

    const peopleEdges = crossDivisionEdges(data.leadership, divisions);

    // ---- layout ----
    const width = Math.max(container.clientWidth || 0, 760);
    const colW = width / divisions.length;
    const nodeH = 38, gap = 14, topMargin = 100, bottomMargin = 30, headerY = 34;
    const maxCount = Math.max(1, ...divisions.map(d => verticalsByDivision[d.id].length));
    const availableH = maxCount * nodeH + (maxCount - 1) * gap;
    const height = topMargin + availableH + bottomMargin;

    const nodePos = {};
    const headerPos = {};
    divisions.forEach((d, ci) => {
      const list = verticalsByDivision[d.id];
      const n = list.length;
      const colExtent = n * nodeH + Math.max(0, n - 1) * gap;
      const yStart = topMargin + (availableH - colExtent) / 2;
      const cx = ci * colW + colW / 2;
      headerPos[d.id] = { x: cx, y: headerY };
      list.forEach((v, vi) => {
        nodePos[v.id] = { x: cx, y: yStart + vi * (nodeH + gap) + nodeH / 2, divisionId: d.id, division: d, vertical: v };
      });
    });
    headerPos.corpfn = { x: width / 2, y: 12 };

    function curvePath(a, b, sameColumn) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (sameColumn) {
        const side = a.x < width / 2 ? -1 : (a.x > width / 2 ? 1 : -1);
        const bow = Math.abs(dy) * 0.4 + 24;
        const qx = mx + side * bow, qy = my;
        return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      }
      const px = -dy / dist, py = dx / dist;
      const bow = dist * 0.12;
      const qx = mx + px * bow, qy = my + py * bow - 18;
      return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }

    // ---- build DOM ----
    container.innerHTML = `
      <div class="cmap-legend">
        <span class="cmap-legend-item"><span class="cmap-swatch cmap-swatch-handoff"></span> Handoff (work passes forward)</span>
        <span class="cmap-legend-item"><span class="cmap-swatch cmap-swatch-shared"></span> Shared (same system/data)</span>
        <span class="cmap-legend-item"><span class="cmap-swatch cmap-swatch-people"></span> Person or corporate function spanning divisions</span>
      </div>
      <div class="cmap-canvas"></div>
      <div class="cmap-detail" id="cmapDetail"><p class="cmap-detail-empty">Click any department to see how it connects.</p></div>
    `;
    const canvas = container.querySelector(".cmap-canvas");
    const detail = container.querySelector("#cmapDetail");

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "cmap-svg");

    const peopleLayer = document.createElementNS(svgNS, "g");
    peopleLayer.setAttribute("class", "cmap-people-layer");
    svg.appendChild(peopleLayer);
    peopleEdges.forEach(e => {
      const a = headerPos[e.from], b = headerPos[e.to];
      if (!a || !b) return;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", curvePath(a, b, false));
      path.setAttribute("class", "cmap-people-edge cmap-edge-" + e.kind);
      path.dataset.a = e.from; path.dataset.b = e.to;
      const title = document.createElementNS(svgNS, "title");
      title.textContent = e.kind === "corpfn" ? `Corporate Functions reaches into ${e.to}` : `${e.label} connects ${e.from} ↔ ${e.to}`;
      path.appendChild(title);
      peopleLayer.appendChild(path);
    });

    const edgeLayer = document.createElementNS(svgNS, "g");
    edgeLayer.setAttribute("class", "cmap-edge-layer");
    svg.appendChild(edgeLayer);
    pairs.forEach(p => {
      const a = nodePos[p.a], b = nodePos[p.b];
      if (!a || !b) return;
      const type = p.rows.every(r => r.type === "shared") ? "shared" : (p.directed ? "handoff" : "mixed");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", curvePath(a, b, a.divisionId === b.divisionId));
      path.setAttribute("class", `cmap-edge cmap-edge-${type}`);
      path.dataset.a = p.a; path.dataset.b = p.b;
      if (p.directed) path.setAttribute("marker-end", "url(#cmapArrow)");
      edgeLayer.appendChild(path);
    });

    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `<marker id="cmapArrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" class="cmap-arrowhead"></path></marker>`;
    svg.insertBefore(defs, svg.firstChild);

    const headerLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(headerLayer);
    divisions.forEach(d => {
      const p = headerPos[d.id];
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", p.x); t.setAttribute("y", p.y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "cmap-col-header");
      t.textContent = d.name;
      headerLayer.appendChild(t);
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(nodeLayer);
    let activeId = null;

    function setActive(id) {
      activeId = activeId === id ? null : id;
      nodeLayer.querySelectorAll(".cmap-node").forEach(el => el.classList.toggle("cmap-node-active", el.dataset.id === activeId));
      const touching = new Set();
      pairs.forEach(p => { if (p.a === activeId || p.b === activeId) touching.add(p.a === activeId ? p.b : p.a); });
      edgeLayer.querySelectorAll(".cmap-edge").forEach(el => {
        const on = !activeId || el.dataset.a === activeId || el.dataset.b === activeId;
        el.classList.toggle("cmap-edge-dim", !on);
      });
      peopleLayer.querySelectorAll(".cmap-people-edge").forEach(el => {
        const on = !activeId || el.dataset.a === activeId || el.dataset.b === activeId;
        el.classList.toggle("cmap-edge-dim", !on);
      });
      renderDetail(activeId, touching);
    }

    function renderDetail(id, touching) {
      if (!id) { detail.innerHTML = `<p class="cmap-detail-empty">Click any department to see how it connects.</p>`; return; }
      const v = verticals[id];
      if (!v) return;
      const rel = pairs.filter(p => p.a === id || p.b === id);
      const peopleRel = peopleEdges.filter(e => e.from === v.division || e.to === v.division);
      detail.innerHTML = `
        <h4>${esc(v.name)}</h4>
        ${rel.length ? rel.map(p => {
          const otherId = p.a === id ? p.b : p.a;
          const other = verticals[otherId];
          return `<div class="cmap-detail-row">
            <div class="cmap-detail-rel"><b>${esc(v.name)}</b> ${p.directed ? (p.direction.from === id ? "→" : "←") : "⇄"} <b>${esc(other ? other.name : otherId)}</b></div>
            ${p.rows.map(r => `<div class="cmap-detail-note">${esc(r.note || "")}</div>`).join("")}
          </div>`;
        }).join("") : `<p class="cmap-detail-empty">No modeled connections yet for this department.</p>`}
        ${peopleRel.length ? `<div class="cmap-detail-people"><b>Spans divisions:</b> ${peopleRel.map(e => esc(e.label)).join(", ")}</div>` : ""}
      `;
    }

    Object.values(nodePos).forEach(n => {
      const g = document.createElementNS(svgNS, "g");
      const quiet = !connectedVerticalIds.has(n.vertical.id);
      g.setAttribute("class", "cmap-node" + (quiet ? " cmap-node-quiet" : ""));
      g.setAttribute("transform", `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      g.dataset.id = n.vertical.id;
      g.tabIndex = 0;
      g.setAttribute("role", "button");
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", -colW * 0.36); rect.setAttribute("y", -nodeH / 2);
      rect.setAttribute("width", colW * 0.72); rect.setAttribute("height", nodeH);
      rect.setAttribute("rx", 8);
      g.appendChild(rect);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dy", "4.5");
      label.setAttribute("class", "cmap-node-label");
      label.textContent = n.vertical.name;
      g.appendChild(label);
      function activate() { setActive(n.vertical.id); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    canvas.appendChild(svg);
    return { setActive };
  };
})();
