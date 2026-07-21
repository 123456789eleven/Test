(function () {
  const VERTICAL_COLOR = { win: "#6366f1", construct: "#06b6d4", protect: "#d97706", connect: "#059669", serve: "#e11d48" };
  window.VERTICAL_COLORS = VERTICAL_COLOR;

  window.renderConnectionsMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container || typeof d3 === "undefined") return;

    const width = Math.max(container.clientWidth || 0, 900);
    const height = Math.max(640, Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.72));
    const cx = width / 2, cy = height / 2;
    const hubRadius = Math.min(width, height) * 0.26;

    const verticalKeys = Object.keys(companyData.verticals);
    const hubNodes = verticalKeys.map((key, i) => {
      const angle = (i / verticalKeys.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: key, kind: "hub", label: companyData.verticals[key].name, color: VERTICAL_COLOR[key],
        x: cx + Math.cos(angle) * hubRadius, y: cy + Math.sin(angle) * hubRadius
      };
    });
    const hubById = Object.fromEntries(hubNodes.map(h => [h.id, h]));

    const funcNodes = [];
    verticalKeys.forEach((key, hi) => {
      const funcs = companyData.verticals[key].funcs;
      const baseAngle = (hi / verticalKeys.length) * 2 * Math.PI - Math.PI / 2;
      const spread = 1.1;
      funcs.forEach((f, fi) => {
        const a = baseAngle + (funcs.length > 1 ? (fi - (funcs.length - 1) / 2) * (spread / (funcs.length - 1)) : 0);
        const r = hubRadius + 110;
        funcNodes.push({
          id: f.id, kind: "function", label: f.label, vertical: key, confirmed: f.confirmed,
          color: VERTICAL_COLOR[key], x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r
        });
      });
    });

    const allNodes = [...hubNodes, ...funcNodes];
    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));

    const belongsLinks = funcNodes.map(f => ({ source: f.vertical, target: f.id, kind: "belongs" }));
    const processLinks = (companyData.processConnections || []).map(c => ({ source: c.from, target: c.to, kind: c.type, note: c.note }));
    const allLinks = [...belongsLinks, ...processLinks];

    const simulation = d3.forceSimulation(allNodes)
      .force("link", d3.forceLink(allLinks).id(d => d.id)
        .distance(l => l.kind === "belongs" ? 75 : 150)
        .strength(l => l.kind === "belongs" ? 0.85 : 0.2))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("collide", d3.forceCollide().radius(d => d.kind === "hub" ? 48 : 32))
      .force("center", d3.forceCenter(cx, cy))
      .stop();
    for (let i = 0; i < 300; i++) simulation.tick();

    const svgNS = "http://www.w3.org/2000/svg";
    container.innerHTML = "";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "cmap-svg");

    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `<marker id="cmArrow" markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto"><path d="M0,0 L6,2.5 L0,5 Z" class="cmap-arrowhead"/></marker>`;
    svg.appendChild(defs);

    const zoneLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(zoneLayer);
    hubNodes.forEach(h => {
      const members = funcNodes.filter(f => f.vertical === h.id);
      let maxDist = 60;
      members.forEach(m => { maxDist = Math.max(maxDist, Math.hypot(m.x - h.x, m.y - h.y)); });
      const zone = document.createElementNS(svgNS, "circle");
      zone.setAttribute("cx", h.x); zone.setAttribute("cy", h.y);
      zone.setAttribute("r", maxDist + 46);
      zone.setAttribute("class", "cmap-zone");
      zone.setAttribute("fill", h.color);
      zoneLayer.appendChild(zone);
    });

    const linkLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(linkLayer);
    // Only the real process connections are drawn -- "belongs to a vertical" links stay
    // in the simulation (for layout/clustering) but aren't rendered, since drawing all 27
    // of them added visual noise without adding information the zone coloring didn't already give.
    processLinks.forEach(l => {
      const s = nodeById[typeof l.source === "object" ? l.source.id : l.source];
      const t = nodeById[typeof l.target === "object" ? l.target.id : l.target];
      if (!s || !t) return;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", s.x); line.setAttribute("y1", s.y);
      line.setAttribute("x2", t.x); line.setAttribute("y2", t.y);
      line.setAttribute("class", "cmap-link cmap-link-" + l.kind);
      line.dataset.a = s.id; line.dataset.b = t.id;
      if (l.kind === "handoff") line.setAttribute("marker-end", "url(#cmArrow)");
      linkLayer.appendChild(line);
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(nodeLayer);
    allNodes.forEach(n => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "cmap-node cmap-node-" + n.kind);
      g.setAttribute("transform", `translate(${n.x},${n.y})`);
      g.dataset.id = n.id;
      g.tabIndex = 0;
      g.setAttribute("role", "button");
      const r = n.kind === "hub" ? 30 : 15;
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", r);
      circle.setAttribute("class", "cmap-circle");
      circle.setAttribute("fill", n.color);
      if (n.kind === "function" && !n.confirmed) circle.setAttribute("fill-opacity", "0.5");
      g.appendChild(circle);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("class", "cmap-label" + (n.kind === "hub" ? " cmap-label-hub" : ""));
      label.setAttribute("y", r + 15);
      label.setAttribute("text-anchor", "middle");
      label.textContent = n.kind === "hub" ? n.label : (n.label.length > 24 ? n.label.slice(0, 22) + "…" : n.label);
      g.appendChild(label);
      function activate() { setFocus(n.id); if (onNodeClick) onNodeClick(n); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    function setFocus(id) {
      const connected = new Set([id]);
      allLinks.forEach(l => {
        const a = typeof l.source === "object" ? l.source.id : l.source;
        const b = typeof l.target === "object" ? l.target.id : l.target;
        if (a === id || b === id) { connected.add(a); connected.add(b); }
      });
      nodeLayer.querySelectorAll(".cmap-node").forEach(el => {
        el.classList.toggle("dim", !connected.has(el.dataset.id));
        el.classList.toggle("cmap-label-visible", connected.has(el.dataset.id));
      });
      linkLayer.querySelectorAll(".cmap-link").forEach(el => {
        const touches = el.dataset.a === id || el.dataset.b === id;
        el.classList.toggle("hi", touches);
        el.classList.toggle("dim", !touches);
      });
      zoneLayer.querySelectorAll(".cmap-zone").forEach(el => el.classList.remove("dim"));
    }

    container.appendChild(svg);

    return { focus: setFocus };
  };
})();
