(function () {
  const HUB_IDS = ["strategies", "advantage", "payroll", "advisory", "corpfn"];
  const HUB_COLOR = { strategies: "#3b82f6", advantage: "#10b981", payroll: "#06b6d4", advisory: "#8b5cf6", corpfn: "#ec4899" };
  const HUB_LABEL = { strategies: "Strategies", advantage: "Advantage", payroll: "Payroll", advisory: "Advisory", corpfn: "Corporate Functions" };
  const EXEC_IDS = ["fx3", "frankIII"];
  const svgNS = "http://www.w3.org/2000/svg";

  function initials(name) {
    const words = name.replace(/^The Honorable\s+/, "").split(/\s+/).filter(w => /^[A-Z]/.test(w));
    return ((words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "")).toUpperCase();
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function verticalConnectionPairs(companyData) {
    const funcToVertical = {};
    Object.entries(companyData.verticals || {}).forEach(([vKey, v]) => {
      (v.funcs || []).forEach(f => { funcToVertical[f.id] = vKey; });
    });
    const seen = new Map();
    (companyData.processConnections || []).forEach(c => {
      const va = funcToVertical[c.from], vb = funcToVertical[c.to];
      if (!va || !vb || va === vb) return;
      const key = [va, vb].sort().join("|");
      if (!seen.has(key)) seen.set(key, [va, vb]);
    });
    return [...seen.values()];
  }

  window.renderOrgMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = Math.max(container.clientWidth || 0, 1040);
    const height = Math.max(760, Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.84));
    const cx = width / 2, cy = height / 2;
    const rMin = Math.min(width, height);
    const rExec = rMin * 0.065;
    const rHub = rMin * 0.19;
    const rDept = rMin * 0.32;
    const rPeople = rMin * 0.465;
    const sectorSize = (2 * Math.PI) / HUB_IDS.length;

    const hubNodes = HUB_IDS.map((id, i) => {
      const angle = i * sectorSize - Math.PI / 2;
      return {
        id, kind: "hub", label: HUB_LABEL[id], color: HUB_COLOR[id], angle,
        x: cx + Math.cos(angle) * rHub, y: cy + Math.sin(angle) * rHub
      };
    });
    const hubById = Object.fromEntries(hubNodes.map(h => [h.id, h]));

    const deptNodes = [];
    HUB_IDS.forEach((hubId, hi) => {
      const depts = Object.entries(companyData.verticals || {}).filter(([, v]) => v.division === hubId);
      const baseAngle = hi * sectorSize - Math.PI / 2;
      const usable = sectorSize * 0.84;
      depts.forEach(([key, v], di) => {
        const a = depts.length > 1 ? baseAngle + (di - (depts.length - 1) / 2) * (usable / (depts.length - 1)) : baseAngle;
        deptNodes.push({
          id: key, kind: "dept", label: v.name, hub: hubId, angle: a, color: HUB_COLOR[hubId],
          x: cx + Math.cos(a) * rDept, y: cy + Math.sin(a) * rDept
        });
      });
    });

    const execPeople = companyData.leadership.filter(l => EXEC_IDS.includes(l.id));
    const execNodes = execPeople.map((p, i) => {
      const a = execPeople.length > 1 ? (i - (execPeople.length - 1) / 2) * 0.9 - Math.PI / 2 : -Math.PI / 2;
      return { id: p.id, kind: "exec", label: p.name, color: "var(--ink)", angle: a, x: cx + Math.cos(a) * rExec, y: cy + Math.sin(a) * rExec };
    });

    const peopleByHub = {};
    HUB_IDS.forEach(id => { peopleByHub[id] = []; });
    companyData.leadership.forEach(p => {
      if (EXEC_IDS.includes(p.id)) return;
      const hubId = p.parent === "root" ? "corpfn" : p.parent;
      if (peopleByHub[hubId]) peopleByHub[hubId].push(p);
    });
    const peopleNodes = [];
    HUB_IDS.forEach((hubId, hi) => {
      const people = peopleByHub[hubId];
      const baseAngle = hi * sectorSize - Math.PI / 2;
      const usable = sectorSize * 0.88;
      people.forEach((p, pi) => {
        const a = people.length > 1 ? baseAngle + (pi - (people.length - 1) / 2) * (usable / (people.length - 1)) : baseAngle;
        peopleNodes.push({
          id: p.id, kind: "person", label: p.name, hub: hubId, angle: a, color: HUB_COLOR[hubId],
          x: cx + Math.cos(a) * rPeople, y: cy + Math.sin(a) * rPeople, cross: p.cross || []
        });
      });
    });

    const allNodes = [{ id: "root", kind: "root", label: "Kelly Benefits", x: cx, y: cy }, ...execNodes, ...hubNodes, ...deptNodes, ...peopleNodes];
    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));

    const crossLinks = [];
    peopleNodes.forEach(p => { p.cross.forEach(hubId => crossLinks.push({ from: p.id, to: hubId, kind: "cross", color: p.color })); });
    const corpLinks = ["strategies", "advantage", "payroll", "advisory"].map(hubId => ({ from: "corpfn", to: hubId, kind: "corp", color: HUB_COLOR.corpfn }));
    const deptLinks = verticalConnectionPairs(companyData).map(([a, b]) => ({ from: a, to: b, kind: "dept", color: "#94a3b8" }));
    const allLinks = [...crossLinks, ...corpLinks, ...deptLinks];

    container.innerHTML = "";
    container.style.position = "relative";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "omap-svg");

    const spokeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(spokeLayer);
    function spoke(fromNode, toNode, extraClass) {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", fromNode.x.toFixed(1)); line.setAttribute("y1", fromNode.y.toFixed(1));
      line.setAttribute("x2", toNode.x.toFixed(1)); line.setAttribute("y2", toNode.y.toFixed(1));
      line.setAttribute("class", "omap-spoke" + (extraClass ? " " + extraClass : ""));
      line.setAttribute("stroke", toNode.color || fromNode.color || "#888");
      spokeLayer.appendChild(line);
    }
    const rootNode = nodeById.root;
    hubNodes.forEach(h => spoke(rootNode, h));
    execNodes.forEach(e => spoke(rootNode, e, "omap-spoke-exec"));
    deptNodes.forEach(d => spoke(hubById[d.hub], d));
    peopleNodes.forEach(p => spoke(hubById[p.hub], p, "omap-spoke-person"));

    const linkLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(linkLayer);
    allLinks.forEach(l => {
      const s = nodeById[l.from], t = nodeById[l.to];
      if (!s || !t) return;
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
      const pull = l.kind === "dept" ? 0.5 : 0.32;
      const qx = cx + (mx - cx) * pull, qy = cy + (my - cy) * pull;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${t.x.toFixed(1)},${t.y.toFixed(1)}`);
      path.setAttribute("class", `omap-link omap-link-${l.kind}`);
      path.setAttribute("stroke", l.color);
      path.dataset.a = l.from; path.dataset.b = l.to;
      linkLayer.appendChild(path);
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(nodeLayer);

    const RADIUS = { root: 40, hub: 32, dept: 16, person: 16, exec: 13 };

    function addNode(n) {
      const r = RADIUS[n.kind];
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", `omap-node omap-node-${n.kind}`);
      g.setAttribute("transform", `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      g.dataset.id = n.id;
      g.tabIndex = 0;
      g.setAttribute("role", "button");

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", r);
      circle.setAttribute("class", "omap-circle");
      if (n.color) circle.setAttribute("fill", n.color);
      g.appendChild(circle);

      if (n.kind === "person" || n.kind === "exec") {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("class", "omap-initials" + (n.kind === "exec" ? " omap-initials-exec" : ""));
        t.setAttribute("text-anchor", "middle"); t.setAttribute("dy", "0.32em");
        t.textContent = initials(n.label);
        g.appendChild(t);
      }
      if (n.kind === "root") {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("class", "omap-root-label");
        t.setAttribute("text-anchor", "middle"); t.setAttribute("dy", "0.32em");
        t.textContent = "KB";
        g.appendChild(t);
      }

      if (n.kind === "hub" || n.kind === "dept") {
        const deg = ((n.angle || 0) * 180) / Math.PI;
        const facingLeft = deg > 90 || deg < -90;
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("class", `omap-label omap-label-${n.kind}`);
        if (n.kind === "hub") {
          label.setAttribute("y", -(r + 12));
          label.setAttribute("text-anchor", "middle");
        } else {
          const off = r + 8;
          label.setAttribute("x", facingLeft ? -off : off);
          label.setAttribute("dy", "0.32em");
          label.setAttribute("text-anchor", facingLeft ? "end" : "start");
        }
        label.textContent = truncate(n.label, n.kind === "hub" ? 24 : 20);
        g.appendChild(label);
      }
      if (n.kind === "person") {
        const deg = ((n.angle || 0) * 180) / Math.PI;
        const facingLeft = deg > 90 || deg < -90;
        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("class", "omap-label omap-label-person");
        const off = r + 7;
        label.setAttribute("x", facingLeft ? -off : off);
        label.setAttribute("dy", "0.32em");
        label.setAttribute("text-anchor", facingLeft ? "end" : "start");
        label.textContent = truncate(n.label, 20);
        g.appendChild(label);
      }

      function activate() { setFocus(n.id); if (onNodeClick) onNodeClick(n.id); }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    }

    addNode(rootNode);
    execNodes.forEach(addNode);
    hubNodes.forEach(addNode);
    deptNodes.forEach(addNode);
    peopleNodes.forEach(addNode);

    function setFocus(id) {
      const connected = new Set([id]);
      allLinks.forEach(l => { if (l.from === id || l.to === id) { connected.add(l.from); connected.add(l.to); } });
      const node = nodeById[id];
      if (node && node.kind === "person") connected.add(node.hub);
      if (node && node.kind === "dept") connected.add(node.hub);
      if (node && node.kind === "exec") connected.add("root");
      nodeLayer.querySelectorAll(".omap-node").forEach(el => {
        el.classList.toggle("dim", !connected.has(el.dataset.id));
      });
      linkLayer.querySelectorAll(".omap-link").forEach(el => {
        const touches = el.dataset.a === id || el.dataset.b === id;
        el.classList.toggle("hi", touches);
        el.classList.toggle("dim", !touches);
      });
      spokeLayer.querySelectorAll(".omap-spoke").forEach(el => el.classList.add("dim"));
    }
    function clearFocus() {
      nodeLayer.querySelectorAll(".omap-node").forEach(el => el.classList.remove("dim"));
      linkLayer.querySelectorAll(".omap-link").forEach(el => el.classList.remove("hi", "dim"));
      spokeLayer.querySelectorAll(".omap-spoke").forEach(el => el.classList.remove("dim"));
    }
    container.addEventListener("click", (e) => { if (e.target === svg) clearFocus(); });

    container.appendChild(svg);
    return { clearFocus };
  };
})();
