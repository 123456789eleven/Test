// 2D DOM-layer readout for whichever real workflow_steps row the pulse is
// currently on — so a viewer can actually read what's happening, not just
// watch a light move with no context. Takes only `simulation` (the exact
// useWorkflowSimulation() return value, owned by a shared ancestor — see
// WorkflowControls.jsx's header comment for why this never calls the hook
// itself) and renders purely off its real `status`/`currentStep`.

export default function WorkflowStepInfo({ simulation }) {
  const { status, currentStep } = simulation;

  if (status === "idle") return null;

  // The dwell timer clears currentStepId to a real value before status ever
  // leaves "idle", but guard anyway rather than rendering a card with
  // nothing real in it.
  if (!currentStep) return null;

  if (status === "done") {
    return (
      <div className="wf-step-info wf-step-info-done">
        <span className="wf-step-info-badge wf-step-info-badge-done">✓ Workflow complete</span>
        <h4 className="wf-step-title">{currentStep.title}</h4>
        {currentStep.description ? <p className="wf-step-desc">{currentStep.description}</p> : null}
      </div>
    );
  }

  return (
    <div className="wf-step-info">
      <div className="wf-step-info-badges">
        {currentStep.step_order != null ? (
          <span className="wf-step-info-badge wf-step-info-badge-order">Step {currentStep.step_order}</span>
        ) : null}
        {currentStep.is_decision_point ? (
          <span className="wf-step-info-badge wf-step-info-badge-decision">⚡ Decision point</span>
        ) : null}
      </div>
      <h4 className="wf-step-title">{currentStep.title}</h4>
      {currentStep.description ? (
        <p className="wf-step-desc">{currentStep.description}</p>
      ) : (
        <p className="wf-step-desc wf-step-desc-empty">No description recorded yet for this step.</p>
      )}
    </div>
  );
}
