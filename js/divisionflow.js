(function () {
  const ORDER = ["strategies", "advantage", "payroll", "advisory"];
  const HUB_COLOR = { strategies: "#3b82f6", advantage: "#10b981", payroll: "#06b6d4", advisory: "#8b5cf6" };

  function trimToward(from, toward, r) {
    const ang = Math.atan2(toward.y - from.y, toward.x - from.x);
    return { x: from.x + Math.cos(ang) * r, y: from.y + Math.sin(ang) * r };
  }

  window.renderDivisionFlow = function (containerId, opts) {
    const { companyData, onNodeClick, onEdgeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;
    const edges = companyData.divisionFlow || [];

    const width = Math.max(container.clientWidth || 0, 520);
    const height = Math.min(Math.max(width * 0.6, 320), 420);
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const nodeR = Math.min(width, height) * 0.105;

    const nodes = ORDER.map((id, i) => {
      const div = companyData.divisions.find(d => d.id === id) || { id, name: id, role: "" };
      const angle = i * (Math.PI / 2) - Math.PI / 2;
      return { id, name: div.name, role: div.role, color: HUB_COLOR[id], x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

    const svgNS = "http://www.w3.org/2000/svg";
    container.innerHTML = "";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "flow-svg");

    const defs = document.createElementNS(svgNS, "defs");
    edges.forEach(e => {
      const marker = document.createElementNS(svgNS, "marker");
      marker.setAttribute("id", "flowArrow-" + e.from + "-" + e.to);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "8.5");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "6.5");
      marker.setAttribute("markerHeight", "6.5");
      marker.setAttribute("orient", "auto-start-reverse");
      const arrowPath = document.createElementNS(svgNS, "path");
      arrowPath.setAttribute("d", "M0,0 L10,5 L0,10 Z");
      arrowPath.setAttribute("fill", (nodeById[e.from] || {}).color || "#888");
      marker.appendChild(arrowPath);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    const edgeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(edgeLayer);
    edges.forEach(e => {
      const s = nodeById[e.from], t = nodeById[e.to];
      if (!s || !t) return;
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
      const bow = 0.3;
      const qx = mx + (mx - cx) * bow, qy = my + (my - cy) * bow;
      const startPt = trimToward(s, { x: qx, y: qy }, nodeR + 2);
      const endPt = trimToward(t, { x: qx, y: qy }, nodeR + 10);

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${startPt.x.toFixed(1)},${startPt.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${endPt.x.toFixed(1)},${endPt.y.toFixed(1)}`);
      path.setAttribute("class", "flow-edge");
      path.setAttribute("stroke", s.color);
      path.setAttribute("marker-end", `url(#flowArrow-${e.from}-${e.to})`);
      path.tabIndex = 0;
      path.setAttribute("role", "button");
      function activateEdge() { onEdgeClick && onEdgeClick(e); }
      path.addEventListener("click", activateEdge);
      path.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activateEdge(); } });
      edgeLayer.appendChild(path);

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", qx.toFixed(1));
      label.setAttribute("y", qy.toFixed(1));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "flow-edge-label");
      label.textContent = e.label;
      label.addEventListener("click", activateEdge);
      edgeLayer.appendChild(label);
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(nodeLayer);
    nodes.forEach(n => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "flow-node");
      g.setAttribute("transform", `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      g.tabIndex = 0;
      g.setAttribute("role", "button");
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", nodeR);
      circle.setAttribute("fill", n.color);
      g.appendChild(circle);

      const nameEl = document.createElementNS(svgNS, "text");
      nameEl.setAttribute("text-anchor", "middle");
      nameEl.setAttribute("dy", "-2");
      nameEl.setAttribute("class", "flow-node-name");
      nameEl.textContent = n.name;
      g.appendChild(nameEl);

      const roleEl = document.createElementNS(svgNS, "text");
      roleEl.setAttribute("text-anchor", "middle");
      roleEl.setAttribute("dy", "14");
      roleEl.setAttribute("class", "flow-node-role");
      roleEl.textContent = n.role;
      g.appendChild(roleEl);

      function activate() { onNodeClick && onNodeClick(n.id); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    container.appendChild(svg);
  };
})();
