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

  function renderStepList(steps) {
    return `
      <div class="cflow">
        ${steps.map((step, i) => renderStepRow(step, i < steps.length - 1)).join("")}
      </div>
    `;
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
                ${b.steps && b.steps.length ? renderStepList(b.steps) : '<div class="cflow-branch-empty">No further step recorded — continues</div>'}
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

  function renderPhase(phase, index) {
    return `
      <div class="cobra-phase${index === 0 ? " cobra-expanded" : ""}" data-phase="${phase.id}">
        <button class="cobra-phase-head">
          <div>
            <h3>${phase.title}</h3>
            <p class="cap">${phase.summary}</p>
          </div>
          <span class="cobra-phase-toggle">▸</span>
        </button>
        <div class="cobra-phase-body">
          ${renderStepList(phase.steps)}
        </div>
      </div>
    `;
  }

  window.renderCobraProcess = function (containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.phases.map(renderPhase).join("");
    container.querySelectorAll(".cobra-phase-head").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".cobra-phase").classList.toggle("cobra-expanded");
      });
    });
  };
})();
