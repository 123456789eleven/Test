(function () {
  const DIVISION_LEADERS = {
    strategies: ["John Kelly"],
    advantage: ["David Kelly", "Bryan Kelly"],
    payroll: ["David Kelly"],
    advisory: ["John Kelly"]
  };
  const CEO_NAME = "Frank Kelly III";
  const CTO_NAME = "Katherine Vahdani";
  const ENROLLMENT_VERTICALS = ["construct", "connect", "serve"];
  const WORKFLOW_EDGES = [["win", "construct"], ["construct", "protect"], ["construct", "connect"], ["construct", "serve"]];

  window.ORG_CONSTANTS = { DIVISION_LEADERS, CEO_NAME, CTO_NAME };

  function buildTree(companyData) {
    return {
      id: "root", name: "Kelly Benefits", type: "root", subtitle: CEO_NAME + " · CEO",
      children: companyData.divisions.map(d => ({
        id: d.id, name: d.name, type: "division", role: d.role,
        leaders: DIVISION_LEADERS[d.id] || [],
        children: d.id === "advantage" ? Object.entries(companyData.verticals).map(([key, v]) => ({
          id: key, name: v.name, type: "vertical", confirmed: v.confirmed,
          seat: key === "connect", enrollment: ENROLLMENT_VERTICALS.includes(key)
        })) : []
      }))
    };
  }

  window.renderOrgMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container || typeof d3 === "undefined") return;

    const treeData = buildTree(companyData);
    const root = d3.hierarchy(treeData);
    const nodeW = 172, nodeH = 66;
    const layout = d3.tree().nodeSize([nodeW + 26, nodeH + 58]);
    layout(root);

    const nodes = root.descendants();
    const links = root.links();

    let minX = Infinity, maxX = -Infinity, maxY = 0;
    nodes.forEach(n => { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); });

    const divisionNodes = nodes.filter(n => n.data.type === "division");
    const divisionY = divisionNodes.length ? divisionNodes[0].y : (nodeH + 58);
    const ctoNode = { x: minX - (nodeW + 64), y: divisionY, data: { id: "cto", name: CTO_NAME, type: "cto", subtitle: "Chief Technology Officer" } };
    minX = Math.min(minX, ctoNode.x);

    const width = (maxX - minX) + nodeW + 80;
    const height = maxY + nodeH + 60;
    const offsetX = -minX + nodeW / 2 + 40;
    function px(n) { return n.x + offsetX; }
    function py(n) { return n.y + 30; }

    const svgNS = "http://www.w3.org/2000/svg";
    container.innerHTML = "";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "orgmap-svg");
    svg.setAttribute("width", "100%");

    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `<marker id="omArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" class="orgmap-arrowhead"/></marker>`;
    svg.appendChild(defs);

    const linkLayer = document.createElementNS(svgNS, "g");
    linkLayer.setAttribute("class", "orgmap-links");
    svg.appendChild(linkLayer);

    const nodeLookup = {};
    nodes.forEach(n => { nodeLookup[n.data.id] = n; });
    nodeLookup.cto = ctoNode;

    function addLink(a, b, cls, curveH) {
      const na = nodeLookup[a], nb = nodeLookup[b];
      if (!na || !nb) return;
      const sx = px(na), sy = py(na), tx = px(nb), ty = py(nb);
      const path = document.createElementNS(svgNS, "path");
      let d;
      if (curveH) {
        const midX = (sx + tx) / 2;
        d = `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
      } else {
        const midY = (sy + ty) / 2;
        d = `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
      }
      path.setAttribute("d", d);
      path.setAttribute("class", "orgmap-link " + cls);
      path.dataset.a = a;
      path.dataset.b = b;
      linkLayer.appendChild(path);
    }

    links.forEach(l => addLink(l.source.data.id, l.target.data.id, "orgmap-link-tree", false));
    WORKFLOW_EDGES.forEach(([a, b]) => addLink(a, b, "orgmap-link-flow", true));
    divisionNodes.forEach(dn => addLink("cto", dn.data.id, "orgmap-link-cross", false));

    WORKFLOW_EDGES.forEach(([a, b]) => {
      const path = linkLayer.querySelector(`path.orgmap-link-flow[data-a="${a}"][data-b="${b}"]`);
      if (path) path.setAttribute("marker-end", "url(#omArrow)");
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    nodeLayer.setAttribute("class", "orgmap-nodes");
    svg.appendChild(nodeLayer);

    function renderNode(n) {
      const d = n.data;
      const fo = document.createElementNS(svgNS, "foreignObject");
      fo.setAttribute("x", px(n) - nodeW / 2);
      fo.setAttribute("y", py(n) - nodeH / 2);
      fo.setAttribute("width", nodeW);
      fo.setAttribute("height", nodeH);
      fo.dataset.id = d.id;
      const div = document.createElement("div");
      div.className = "orgmap-node orgmap-node-" + d.type + (d.seat ? " orgmap-node-seat" : "");
      div.tabIndex = 0;
      div.innerHTML = `
        <div class="omn-name">${d.name}${d.enrollment ? '<span class="omn-dot" title="Shares enrollment responsibility"></span>' : ""}</div>
        <div class="omn-sub">${d.subtitle || d.role || (d.leaders && d.leaders.length ? d.leaders.join(", ") : "")}</div>
        ${d.seat ? '<div class="omn-seat">YOU ARE HERE</div>' : ""}
      `;
      div.addEventListener("click", () => { if (onNodeClick) onNodeClick(d.id); });
      div.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onNodeClick) onNodeClick(d.id); } });
      div.addEventListener("mouseenter", () => setHighlight(d.id));
      div.addEventListener("mouseleave", () => setHighlight(null));
      fo.appendChild(div);
      nodeLayer.appendChild(fo);
    }
    nodes.forEach(renderNode);
    renderNode(ctoNode);

    function setHighlight(id) {
      const allLinks = Array.from(linkLayer.querySelectorAll(".orgmap-link"));
      const allNodeDivs = Array.from(nodeLayer.querySelectorAll(".orgmap-node"));
      if (!id) {
        allLinks.forEach(l => l.classList.remove("dim", "hi"));
        allNodeDivs.forEach(n => n.classList.remove("dim"));
        return;
      }
      allLinks.forEach(l => {
        const touches = l.dataset.a === id || l.dataset.b === id;
        l.classList.toggle("hi", touches);
        l.classList.toggle("dim", !touches);
      });
      const connectedIds = new Set([id]);
      allLinks.forEach(l => { if (l.classList.contains("hi")) { connectedIds.add(l.dataset.a); connectedIds.add(l.dataset.b); } });
      allNodeDivs.forEach(n => {
        const nodeId = n.parentElement.dataset.id;
        n.classList.toggle("dim", !connectedIds.has(nodeId));
      });
    }

    container.appendChild(svg);
  };
})();
