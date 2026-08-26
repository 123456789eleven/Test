import { getImprovementForStep, useImprovementLens } from "./improvementLens";

// 2D DOM-layer readout for whichever real workflow_steps row the pulse is
// currently on — so a viewer can actually read what's happening, not just
// watch a light move with no context. Takes only `simulation` (the exact
// useWorkflowSimulation() return value, owned by a shared ancestor — see
// WorkflowControls.jsx's header comment for why this never calls the hook
// itself) and renders purely off its real `status`/`currentStep`.

// The real "why this step is risky" callout — surfaced only for the 5 of 56
// real steps that carry a sourced `improve` annotation in cobra-process.json
// (see improvementLens.js for how a step's real step_order maps back to it).
// Everything rendered here is the real note/ask text, not a summary of it.
function ImprovementNote({ lens, stepOrder }) {
  const improvement = getImprovementForStep(lens, stepOrder);
  if (!improvement) return null;
  return (
    <div className="wf-improve" title={improvement.def || undefined}>
      <span className="wf-improve-tag">⚠ {improvement.label}</span>
      <p className="wf-improve-note">{improvement.note}</p>
      {improvement.ask ? (
        <p className="wf-improve-ask">
          <strong>Worth asking:</strong> {improvement.ask}
        </p>
      ) : null}
    </div>
  );
}

export default function WorkflowStepInfo({ simulation }) {
  const { status, currentStep } = simulation;
  const lens = useImprovementLens();

  if (status === "idle") return null;

  // The dwell timer clears currentStepId to a real value before status ever
  // leaves "idle", but guard anyway rather than rendering a card with
  // nothing real in it.
  if (!currentStep) return null;

  if (status === "done") {
    return (
      // Keyed on the step id so this still plays its entrance fade on the
      // (rare) case a fresh "done" card follows a different one directly —
      // matches the keyed remount pattern used below for the playing state.
      <div className="wf-step-info wf-step-info-done" key={currentStep.id}>
        <span className="wf-step-info-badge wf-step-info-badge-done">✓ Workflow complete</span>
        <h4 className="wf-step-title">{currentStep.title}</h4>
        {currentStep.description ? <p className="wf-step-desc">{currentStep.description}</p> : null}
        <ImprovementNote lens={lens} stepOrder={currentStep.step_order} />
      </div>
    );
  }

  return (
    // Keyed on the step id so every step the pulse lands on — not just the
    // card's first appearance — replays a small settle-in fade, matching the
    // pulse's own movement instead of the readout just snapping to new text.
    <div className="wf-step-info" key={currentStep.id}>
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
      <ImprovementNote lens={lens} stepOrder={currentStep.step_order} />
    </div>
  );
}
