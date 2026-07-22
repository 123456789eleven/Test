(function () {
  function renderStep(step) {
    if (step.type === "decision") {
      return `
        <li class="cobra-step cobra-step-decision">
          <div class="cobra-step-text"><span class="cobra-diamond">◆</span> ${step.text}</div>
          <div class="cobra-branches">
            ${step.branches.map(b => `
              <div class="cobra-branch">
                <div class="cobra-branch-label">${b.label}</div>
                ${b.steps && b.steps.length ? `<ul class="cobra-steps">${b.steps.map(renderStep).join("")}</ul>` : ""}
              </div>
            `).join("")}
          </div>
        </li>
      `;
    }
    return `
      <li class="cobra-step">
        <div class="cobra-step-text">${step.text}</div>
        ${step.responsibility || step.time ? `
          <div class="cobra-step-meta">
            ${step.responsibility ? `<span class="cobra-badge cobra-badge-who">${step.responsibility}</span>` : ""}
            ${step.time ? `<span class="cobra-badge cobra-badge-time">${step.time}</span>` : ""}
          </div>
        ` : ""}
      </li>
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
          <ul class="cobra-steps">${phase.steps.map(renderStep).join("")}</ul>
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
