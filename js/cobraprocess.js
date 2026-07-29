(function () {
  const ROLE_LABEL = { cobraAdminI: "Admin I", cobraAdminII: "Admin II" };
  let IMPROVE_CONCEPTS = {};

  function renderImproveBadge(item) {
    if (!item.improve) return "";
    return `<span class="cflow-improve-badge" title="Process-improvement note available">◆</span>`;
  }

  function renderImprovePanel(item) {
    if (!item.improve) return "";
    const c = IMPROVE_CONCEPTS[item.improve.concept] || {};
    return `
      <div class="cflow-improve-panel">
        ${c.label ? `<span class="cflow-improve-tag">${c.label}</span>` : ""}
        <p class="cflow-improve-note">${item.improve.note}</p>
        ${item.improve.ask ? `<p class="cflow-improve-ask"><strong>Ask yourself:</strong> ${item.improve.ask}</p>` : ""}
      </div>
    `;
  }

  function renderImproveLensCard(data) {
    const concepts = data.improvementConcepts;
    if (!concepts) return "";
    const entries = Object.entries(concepts);
    return `
      <div class="improve-lens-card">
        <div class="improve-lens-head">
          <h4>Read this like a manager would</h4>
          <p class="cap">Every process has friction built into it — moving up means learning to see it, name it, and ask the right question about it. These are the patterns worth training your eye on, mapped onto the steps below where they actually show up.</p>
        </div>
        <div class="improve-glossary">
          ${entries.map(([key, c]) => `
            <div class="improve-glossary-item">
              <span class="improve-glossary-label">${c.label}</span>
              <p>${c.def}</p>
            </div>
          `).join("")}
        </div>
        <button type="button" class="improve-lens-toggle" id="cobraImproveToggle">Show process-improvement notes</button>
      </div>
    `;
  }

  function isTransition(step) {
    return typeof step.text === "string" && step.text.trim().startsWith("→");
  }

  function renderMeta(step) {
    if (!step.responsibility && !step.time) return "";
    return `
      <div class="cflow-node-meta">
        ${step.responsibility ? `<span class="cobra-badge cobra-badge-who">${step.responsibility}</span>` : ""}
        ${step.time ? `<span class="cobra-badge cobra-badge-time">${step.time}</span>` : ""}
      </div>
    `;
  }

  function renderStepRows(steps) {
    return steps.map((step, i) => renderStepRow(step, i < steps.length - 1)).join("");
  }

  function renderStepRow(step, hasNext) {
    const connector = hasNext ? '<div class="cflow-connector"></div>' : "";
    const roleAttr = step.role ? ` data-role="${step.role}"` : "";
    const roleBadge = step.role ? `<span class="cflow-role-badge cflow-role-${step.role}">${ROLE_LABEL[step.role] || step.role}</span>` : "";

    if (step.type === "decision") {
      return `
        <div class="cflow-step">
          <div class="cflow-node cflow-decision"${roleAttr}>
            ${roleBadge}
            <div class="cflow-node-text">${step.text}</div>
            ${renderImproveBadge(step)}
          </div>
          ${renderImprovePanel(step)}
          <div class="cflow-fork${step.branches.length < 2 ? " cflow-fork-single" : ""}">
            ${step.branches.map(b => `
              <div class="cflow-branch-col">
                <div class="cflow-branch-label">${b.label}</div>
                ${b.steps && b.steps.length ? `<div class="cflow">${renderStepRows(b.steps)}</div>` : '<div class="cflow-branch-empty">No further step recorded — continues</div>'}
              </div>
            `).join("")}
          </div>
        </div>
        ${connector}
      `;
    }

    return `
      <div class="cflow-step">
        <div class="cflow-node ${isTransition(step) ? "cflow-transition" : "cflow-process"}"${roleAttr}>
          ${roleBadge}
          <div class="cflow-node-text">${step.text}</div>
          ${renderImproveBadge(step)}
          ${renderMeta(step)}
        </div>
        ${renderImprovePanel(step)}
      </div>
      ${connector}
    `;
  }

  function renderPhaseMarker(phase, index) {
    return `
      <div class="cflow-step">
        <div class="cflow-phase-marker">
          <span class="cflow-phase-num">${index + 1}</span>
          <span class="cflow-phase-title">${phase.title}</span>
        </div>
      </div>
      <div class="cflow-connector"></div>
    `;
  }

  function renderRolesCard(data) {
    if (!data.roles) return "";
    const entries = Object.entries(data.roles);
    return `
      <div class="cobra-roles">
        <h4>Who does what — your actual workday</h4>
        ${data.rolesNote ? `<p class="cobra-roles-note">${data.rolesNote}</p>` : ""}
        <div class="cobra-roles-grid">
          ${entries.map(([key, r]) => `
            <div class="cobra-role-card cobra-role-${key}">
              <h5>${r.title}${renderImproveBadge(r)}</h5>
              <ul>${r.tasks.map(t => `<li>${t}</li>`).join("")}</ul>
              ${renderImprovePanel(r)}
            </div>
          `).join("")}
        </div>
        <div class="cobra-role-filters" id="cobraRoleFilters">
          <button class="wb-filter active" data-role="all">Show all steps</button>
          ${entries.map(([key, r]) => `<button class="wb-filter" data-role="${key}">${r.title} steps only</button>`).join("")}
        </div>
      </div>
    `;
  }

  window.renderCobraProcess = function (containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    IMPROVE_CONCEPTS = data.improvementConcepts || {};
    const parts = [];
    data.phases.forEach((phase, pi) => {
      parts.push(renderPhaseMarker(phase, pi));
      parts.push(renderStepRows(phase.steps));
      if (pi < data.phases.length - 1) parts.push('<div class="cflow-connector"></div>');
    });
    container.innerHTML = renderRolesCard(data) + renderImproveLensCard(data) + `<div class="cflow">${parts.join("")}</div>`;

    const improveToggle = document.getElementById("cobraImproveToggle");
    if (improveToggle) {
      improveToggle.addEventListener("click", () => {
        const on = container.classList.toggle("cflow-improve-on");
        improveToggle.textContent = on ? "Hide process-improvement notes" : "Show process-improvement notes";
        improveToggle.classList.toggle("active", on);
      });
    }

    const filterBar = document.getElementById("cobraRoleFilters");
    if (filterBar) {
      filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        filterBar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const role = btn.dataset.role;
        container.querySelectorAll(".cflow-node").forEach(el => {
          if (role === "all") { el.classList.remove("cflow-dim"); return; }
          el.classList.toggle("cflow-dim", el.dataset.role !== role);
        });
      });
    }
  };
})();
