(function () {
  const HUB_IDS = ["strategies", "advantage", "payroll", "advisory", "corpfn"];
  const HUB_LABEL = { strategies: "Strategies", advantage: "Advantage", payroll: "Payroll", advisory: "Advisory", corpfn: "Corporate Functions" };
  const EXEC_IDS = ["fx3", "frankIII"];

  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  window.renderConnectionsMatrix = function (containerId, opts) {
    const { companyData, onCellClick } = opts;
    const container = document.getElementById(containerId);
    if (!container) return;

    const cells = {};
    HUB_IDS.forEach(a => { cells[a] = {}; HUB_IDS.forEach(b => { cells[a][b] = []; }); });

    companyData.leadership.forEach(p => {
      if (EXEC_IDS.includes(p.id)) return;
      const home = p.parent === "root" ? "corpfn" : p.parent;
      (p.cross || []).forEach(crossId => {
        if (!cells[home] || !cells[home][crossId]) return;
        cells[home][crossId].push({ type: "person", label: `${p.name} — ${p.title}`, id: p.id });
        cells[crossId][home].push({ type: "person", label: `${p.name} — ${p.title}`, id: p.id });
      });
    });
    ["strategies", "advantage", "payroll", "advisory"].forEach(divId => {
      cells.corpfn[divId].push({ type: "corp", label: "Corporate Functions serves this division", id: "corpfn" });
      cells[divId].corpfn.push({ type: "corp", label: "Served by Corporate Functions", id: "corpfn" });
    });

    let html = `<table class="cmx-table"><thead><tr><th class="cmx-corner"></th>${HUB_IDS.map(id => `<th>${HUB_LABEL[id]}</th>`).join("")}</tr></thead><tbody>`;
    HUB_IDS.forEach(rowId => {
      html += `<tr><th>${HUB_LABEL[rowId]}</th>`;
      HUB_IDS.forEach(colId => {
        if (rowId === colId) { html += `<td class="cmx-diag">—</td>`; return; }
        const conns = cells[rowId][colId];
        if (!conns.length) { html += `<td class="cmx-empty"></td>`; return; }
        const kind = conns[0].type;
        html += `<td class="cmx-cell cmx-cell-${kind}" data-row="${esc(rowId)}" data-col="${esc(colId)}" tabindex="0" role="button">${conns.length}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll(".cmx-cell").forEach(td => {
      function activate() {
        const rowId = td.dataset.row, colId = td.dataset.col;
        container.querySelectorAll(".cmx-cell").forEach(el => el.classList.remove("cmx-active"));
        td.classList.add("cmx-active");
        if (onCellClick) onCellClick({ row: rowId, col: colId, connections: cells[rowId][colId] });
      }
      td.addEventListener("click", activate);
      td.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
    });
  };
})();
