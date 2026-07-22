(function () {
  const VERTICAL_COLOR = { win: "#6366f1", construct: "#06b6d4", protect: "#d97706", connect: "#059669", serve: "#e11d48" };
  window.VERTICAL_COLORS = VERTICAL_COLOR;

  window.renderConnectionsMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = Math.max(container.clientWidth || 0, 960);
    const height = Math.max(680, Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.74));
    const cx = width / 2, cy = height / 2;
    const hubRadius = Math.min(width, height) * 0.20;
    const funcRadius = Math.min(width, height) * 0.44;

    const verticalKeys = Object.keys(companyData.verticals);
    const sectorSize = (2 * Math.PI) / verticalKeys.length;

    const hubNodes = verticalKeys.map((key, i) => {
      const angle = i * sectorSize - Math.PI / 2;
      return {
        id: key, kind: "hub", label: companyData.verticals[key].name, color: VERTICAL_COLOR[key], angle,
        x: cx + Math.cos(angle) * hubRadius, y: cy + Math.sin(angle) * hubRadius
      };
    });

    const funcNodes = [];
    verticalKeys.forEach((key, hi) => {
      const funcs = companyData.verticals[key].funcs;
      const baseAngle = hi * sectorSize - Math.PI / 2;
      const usable = sectorSize * 0.72;
      funcs.forEach((f, fi) => {
        const a = funcs.length > 1 ? baseAngle + (fi - (funcs.length - 1) / 2) * (usable / (funcs.length - 1)) : baseAngle;
        funcNodes.push({
          id: f.id, kind: "function", label: f.label, vertical: key, confirmed: f.confirmed, angle: a,
          color: VERTICAL_COLOR[key], x: cx + Math.cos(a) * funcRadius, y: cy + Math.sin(a) * funcRadius,
          hubX: cx + Math.cos(a) * hubRadius * 1.3, hubY: cy + Math.sin(a) * hubRadius * 1.3
        });
      });
    });

    const allNodes = [...hubNodes, ...funcNodes];
    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));
    const processLinks = (companyData.processConnections || []).map(c => ({ from: c.from, to: c.to, kind: c.type, note: c.note }));

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

    // Faint sector rings (one per vertical) -- structure, not noise.
    const ringLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(ringLayer);
    hubNodes.forEach(h => {
      const a0 = h.angle - sectorSize * 0.42, a1 = h.angle + sectorSize * 0.42;
      const rOuter = funcRadius + 34;
      const p0 = [cx + Math.cos(a0) * rOuter, cy + Math.sin(a0) * rOuter];
      const p1 = [cx + Math.cos(a1) * rOuter, cy + Math.sin(a1) * rOuter];
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${cx},${cy} L${p0[0]},${p0[1]} A${rOuter},${rOuter} 0 0 1 ${p1[0]},${p1[1]} Z`);
      path.setAttribute("class", "cmap-sector");
      path.setAttribute("fill", h.color);
      ringLayer.appendChild(path);
    });

    // Faint spokes: hub to each of its own functions (structure, always dim).
    const spokeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(spokeLayer);
    funcNodes.forEach(f => {
      const hub = nodeById[f.vertical];
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", hub.x); line.setAttribute("y1", hub.y);
      line.setAttribute("x2", f.x); line.setAttribute("y2", f.y);
      line.setAttribute("class", "cmap-spoke");
      spokeLayer.appendChild(line);
    });

    // Process connections as bundled chords, curved toward the center.
    const linkLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(linkLayer);
    processLinks.forEach(l => {
      const s = nodeById[l.from], t = nodeById[l.to];
      if (!s || !t) return;
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
      const pull = 0.42;
      const qx = cx + (mx - cx) * pull, qy = cy + (my - cy) * pull;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${s.x},${s.y} Q${qx},${qy} ${t.x},${t.y}`);
      path.setAttribute("class", "cmap-link cmap-link-" + l.kind);
      path.dataset.a = s.id; path.dataset.b = t.id;
      if (l.kind === "handoff") path.setAttribute("marker-end", "url(#cmArrow)");
      linkLayer.appendChild(path);
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
      const r = n.kind === "hub" ? 26 : 8;
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", r);
      circle.setAttribute("class", "cmap-circle");
      circle.setAttribute("fill", n.color);
      if (n.kind === "function" && !n.confirmed) circle.setAttribute("fill-opacity", "0.55");
      g.appendChild(circle);

      const deg = (n.angle * 180) / Math.PI;
      const facingLeft = deg > 90 || deg < -90;
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("class", "cmap-label" + (n.kind === "hub" ? " cmap-label-hub" : ""));
      const labelOffset = r + 8;
      if (n.kind === "hub") {
        label.setAttribute("y", -(r + 12));
        label.setAttribute("text-anchor", "middle");
      } else {
        label.setAttribute("x", facingLeft ? -labelOffset : labelOffset);
        label.setAttribute("dy", "0.32em");
        label.setAttribute("text-anchor", facingLeft ? "end" : "start");
      }
      label.textContent = n.kind === "hub" ? n.label : (n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label);
      g.appendChild(label);

      function activate() { setFocus(n.id); if (onNodeClick) onNodeClick(n); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    function setFocus(id) {
      const connected = new Set([id]);
      processLinks.forEach(l => { if (l.from === id || l.to === id) { connected.add(l.from); connected.add(l.to); } });
      const hub = nodeById[id] && nodeById[id].kind === "function" ? nodeById[id].vertical : id;
      connected.add(hub);

      nodeLayer.querySelectorAll(".cmap-node").forEach(el => {
        el.classList.toggle("dim", !connected.has(el.dataset.id));
      });
      linkLayer.querySelectorAll(".cmap-link").forEach(el => {
        const touches = el.dataset.a === id || el.dataset.b === id;
        el.classList.toggle("hi", touches);
        el.classList.toggle("dim", !touches);
      });
      spokeLayer.querySelectorAll(".cmap-spoke").forEach(el => el.classList.add("dim"));
      ringLayer.querySelectorAll(".cmap-sector").forEach(el => el.classList.add("dim"));
    }

    container.appendChild(svg);
    return { focus: setFocus };
  };
})();
