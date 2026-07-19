(function () {
  const EXEC_IDS = ["fx3", "frankIII"];

  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  function renderBox(node) {
    const lines = (node.lines || []).map(l => `<div class="ocn-line">${l}</div>`).join("");
    const statusClass = node.type === "function" ? (node.confirmed ? " ocn-confirmed" : " ocn-estimated") : "";
    return `
      <div class="ocn ocn-${node.type}${node.seat ? " ocn-seat" : ""}${statusClass}" data-id="${escAttr(node.id)}" tabindex="0" role="button">
        <div class="ocn-name">${node.name}</div>
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

    const divisionNodes = companyData.divisions.map(d => {
      const people = byDivision(d.id);
      const node = {
        id: d.id, type: "division", name: d.name, role: d.role,
        lines: people.map(p => `${p.name} — ${p.title}`)
      };
      if (d.id === "advantage") {
        node.children = Object.entries(companyData.verticals).map(([key, v]) => ({
          id: key, type: "vertical", name: v.name,
          role: v.confirmed ? "Confirmed" : "Estimated — verify",
          seat: key === "connect",
          lines: [],
          children: v.funcs.map(([label, confirmed], i) => ({
            id: `${key}-fn-${i}`, type: "function", name: label,
            role: confirmed ? "Confirmed" : "Estimated", confirmed
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
    const childrenHtml = children.length
      ? `<ul>${children.map(c => `<li>${renderNode(c)}</li>`).join("")}</ul>`
      : "";
    return renderBox(node) + childrenHtml;
  }

  window.renderOrgMap = function (containerId, opts) {
    const { companyData, onNodeClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const tree = buildTree(companyData);
    container.innerHTML = `<ul class="orgchart"><li>${renderNode(tree)}</li></ul>`;

    container.querySelectorAll(".ocn").forEach(el => {
      el.addEventListener("click", () => { if (onNodeClick) onNodeClick(el.dataset.id); });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onNodeClick) onNodeClick(el.dataset.id); }
      });
    });
  };
})();
