(function () {
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

    if (step.type === "decision") {
      return `
        <div class="cflow-step">
          <div class="cflow-node cflow-decision">
            <div class="cflow-node-text">${step.text}</div>
          </div>
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
        <div class="cflow-node ${isTransition(step) ? "cflow-transition" : "cflow-process"}">
          <div class="cflow-node-text">${step.text}</div>
          ${renderMeta(step)}
        </div>
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

  window.renderCobraProcess = function (containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const parts = [];
    data.phases.forEach((phase, pi) => {
      parts.push(renderPhaseMarker(phase, pi));
      parts.push(renderStepRows(phase.steps));
      if (pi < data.phases.length - 1) parts.push('<div class="cflow-connector"></div>');
    });
    container.innerHTML = `<div class="cflow">${parts.join("")}</div>`;
  };
})();
