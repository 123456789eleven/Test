(function () {
  const VERTICAL_COLOR = { win: "#6366f1", construct: "#06b6d4", protect: "#d97706", connect: "#059669", serve: "#e11d48" };
  window.VERTICAL_COLORS = VERTICAL_COLOR;

  const HUB_COLOR = { executive: "#f59e0b", strategies: "#3b82f6", advantage: "#10b981", payroll: "#06b6d4", advisory: "#8b5cf6", corpfn: "#ec4899" };
  const HUB_LABEL = { executive: "Executive", strategies: "Strategies", advantage: "Advantage", payroll: "Payroll", advisory: "Advisory", corpfn: "Corporate Functions" };
  const EXEC_IDS = ["fx3", "frankIII"];

  function initials(name) {
    const words = name.replace(/^The Honorable\s+/, "").split(/\s+/).filter(w => /^[A-Z]/.test(w));
    return (words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "");
  }

  function primaryHub(person) {
    if (EXEC_IDS.includes(person.id)) return "executive";
    if (person.parent === "root") return "corpfn";
    return person.parent;
  }

  window.renderConnectionsMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = Math.max(container.clientWidth || 0, 960);
    const height = Math.max(680, Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.74));
    const cx = width / 2, cy = height / 2;
    const hubRadius = Math.min(width, height) * 0.19;
    const personRadius = Math.min(width, height) * 0.40;

    const hubIds = ["executive", "strategies", "advantage", "payroll", "advisory", "corpfn"];
    const sectorSize = (2 * Math.PI) / hubIds.length;

    const peopleByHub = {};
    hubIds.forEach(h => { peopleByHub[h] = []; });
    companyData.leadership.forEach(p => { peopleByHub[primaryHub(p)].push(p); });

    const hubNodes = hubIds.map((id, i) => {
      const angle = i * sectorSize - Math.PI / 2;
      return {
        id, kind: "hub", label: HUB_LABEL[id], color: HUB_COLOR[id], angle,
        x: cx + Math.cos(angle) * hubRadius, y: cy + Math.sin(angle) * hubRadius
      };
    });

    const personNodes = [];
    hubIds.forEach((hubId, hi) => {
      const people = peopleByHub[hubId];
      const baseAngle = hi * sectorSize - Math.PI / 2;
      const usable = sectorSize * 0.74;
      people.forEach((p, pi) => {
        const a = people.length > 1 ? baseAngle + (pi - (people.length - 1) / 2) * (usable / (people.length - 1)) : baseAngle;
        personNodes.push({
          id: p.id, kind: "person", label: p.name, title: p.title, hub: hubId, angle: a,
          color: HUB_COLOR[hubId], x: cx + Math.cos(a) * personRadius, y: cy + Math.sin(a) * personRadius,
          cross: p.cross || []
        });
      });
    });

    const allNodes = [...hubNodes, ...personNodes];
    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));

    // Cross-division links: real, sourced dual-role people (John Kelly, David Kelly, Wesley Mace).
    const crossLinks = [];
    personNodes.forEach(p => { p.cross.forEach(hubId => crossLinks.push({ from: p.id, to: hubId, kind: "cross" })); });
    // Corporate Functions genuinely serves all four divisions.
    const servesLinks = ["strategies", "advantage", "payroll", "advisory"].map(hubId => ({ from: "corpfn", to: hubId, kind: "serves" }));
    const allLinks = [...crossLinks, ...servesLinks];

    const svgNS = "http://www.w3.org/2000/svg";
    container.innerHTML = "";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "cmap-svg");

    // Faint spokes: each person to their own primary hub.
    const spokeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(spokeLayer);
    personNodes.forEach(p => {
      const hub = nodeById[p.hub];
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", hub.x); line.setAttribute("y1", hub.y);
      line.setAttribute("x2", p.x); line.setAttribute("y2", p.y);
      line.setAttribute("class", "cmap-spoke");
      line.setAttribute("stroke", hub.color);
      spokeLayer.appendChild(line);
    });

    // Cross-division and serves-all links as vivid curved chords.
    const linkLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(linkLayer);
    allLinks.forEach(l => {
      const s = nodeById[l.from], t = nodeById[l.to];
      if (!s || !t) return;
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
      const pull = 0.35;
      const qx = cx + (mx - cx) * pull, qy = cy + (my - cy) * pull;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${s.x},${s.y} Q${qx},${qy} ${t.x},${t.y}`);
      path.setAttribute("class", "cmap-link cmap-link-" + l.kind);
      path.dataset.a = s.id; path.dataset.b = t.id;
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
      const r = n.kind === "hub" ? 30 : 17;
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", r);
      circle.setAttribute("class", "cmap-circle");
      circle.setAttribute("fill", n.color);
      g.appendChild(circle);

      if (n.kind === "person") {
        const initEl = document.createElementNS(svgNS, "text");
        initEl.setAttribute("class", "cmap-initials");
        initEl.setAttribute("text-anchor", "middle");
        initEl.setAttribute("dy", "0.34em");
        initEl.textContent = initials(n.label);
        g.appendChild(initEl);
      }

      const deg = (n.angle * 180) / Math.PI;
      const facingLeft = deg > 90 || deg < -90;
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("class", "cmap-label" + (n.kind === "hub" ? " cmap-label-hub" : ""));
      if (n.kind === "hub") {
        label.setAttribute("y", -(r + 12));
        label.setAttribute("text-anchor", "middle");
      } else {
        const labelOffset = r + 8;
        label.setAttribute("x", facingLeft ? -labelOffset : labelOffset);
        label.setAttribute("dy", "0.32em");
        label.setAttribute("text-anchor", facingLeft ? "end" : "start");
      }
      label.textContent = n.kind === "hub" ? n.label : (n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label);
      g.appendChild(label);

      function activate() { setFocus(n.id); if (onNodeClick) onNodeClick(n); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    function setFocus(id) {
      const connected = new Set([id]);
      allLinks.forEach(l => { if (l.from === id || l.to === id) { connected.add(l.from); connected.add(l.to); } });
      const node = nodeById[id];
      if (node && node.kind === "person") connected.add(node.hub);

      nodeLayer.querySelectorAll(".cmap-node").forEach(el => {
        el.classList.toggle("dim", !connected.has(el.dataset.id));
      });
      linkLayer.querySelectorAll(".cmap-link").forEach(el => {
        const touches = el.dataset.a === id || el.dataset.b === id;
        el.classList.toggle("hi", touches);
        el.classList.toggle("dim", !touches);
      });
      spokeLayer.querySelectorAll(".cmap-spoke").forEach(el => el.classList.add("dim"));
    }

    container.appendChild(svg);
    return { focus: setFocus };
  };
})();
