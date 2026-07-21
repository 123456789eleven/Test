(function () {
  const EXEC_IDS = ["fx3", "frankIII"];

  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  function renderBox(node) {
    const lines = (node.lines || []).map(l => `<div class="ocn-line">${l}</div>`).join("");
    const statusClass = node.type === "function" ? (node.confirmed ? " ocn-confirmed" : " ocn-estimated") : "";
    const collapsible = node.type === "vertical" && node.children && node.children.length;
    const accentStyle = (node.accentColor && !node.seat) ? ` style="border-top-color:${node.accentColor}; border-top-width:3px;"` : "";
    return `
      <div class="ocn ocn-${node.type}${node.seat ? " ocn-seat" : ""}${statusClass}${collapsible ? " oc-toggle" : ""}" data-id="${escAttr(node.id)}" tabindex="0" role="button"${accentStyle}>
        <div class="ocn-name">${node.name}${collapsible ? '<span class="ocn-chevron">▸</span>' : ""}${node.linked ? '<span class="ocn-link-dot" title="Connects to other functions">🔗</span>' : ""}</div>
        ${node.role ? `<div class="ocn-role">${node.role}</div>` : ""}
        ${lines}
        ${node.seat ? '<div class="ocn-seat-badge">YOU ARE HERE</div>' : ""}
      </div>
    `;
  }

  function buildTree(companyData) {
    const leadership = companyData.leadership;
    const byDivision = (divId) => leadership.filter(l => l.parent === divId || (l.cross && l.cross.includes(divId)));
    const corpPeople = leadership.filter(l => l.parent === "root" && !EXEC_IDS.includes(l.id));
    const execPeople = leadership.filter(l => EXEC_IDS.includes(l.id));
    const connections = companyData.processConnections || [];
    const connectedIds = new Set();
    connections.forEach(c => { connectedIds.add(c.from); connectedIds.add(c.to); });

    const divisionNodes = companyData.divisions.map(d => {
      const people = byDivision(d.id);
      const node = {
        id: d.id, type: "division", name: d.name, role: d.role,
        lines: people.map(p => `${p.name} — ${p.title}`)
      };
      if (d.id === "advantage") {
        const palette = window.VERTICAL_COLORS || {};
        node.children = Object.entries(companyData.verticals).map(([key, v]) => ({
          id: key, type: "vertical", name: v.name,
          role: v.confirmed ? "Confirmed" : "Estimated — verify",
          seat: key === "connect",
          lines: [], accentColor: palette[key],
          children: v.funcs.map(f => ({
            id: f.id, type: "function", name: f.label,
            role: f.confirmed ? "Confirmed" : "Estimated", confirmed: f.confirmed,
            linked: connectedIds.has(f.id), accentColor: palette[key]
          }))
        }));
      }
      return node;
    });

    const corpNode = {
      id: "corpfn", type: "group", name: "Corporate Functions", role: "Shared services, all divisions",
      lines: corpPeople.map(p => `${p.name} — ${p.title}`)
    };

    return {
      id: "root", type: "root", name: "Kelly Benefits",
      lines: execPeople.map(p => `${p.name} — ${p.title}`),
      children: [...divisionNodes, corpNode]
    };
  }

  function renderNode(node) {
    const children = node.children || [];
    const listClass = node.type === "vertical" && children.length ? " oc-fn-list" : "";
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

    function handleActivate(el) {
      if (onNodeClick) onNodeClick(el.dataset.id);
      if (el.classList.contains("oc-toggle")) {
        const ul = el.nextElementSibling;
        if (ul) ul.classList.toggle("oc-expanded");
        el.classList.toggle("oc-expanded");
      }
    }
    container.querySelectorAll(".ocn").forEach(el => {
      el.addEventListener("click", () => handleActivate(el));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(el); }
      });
    });
  };
})();
