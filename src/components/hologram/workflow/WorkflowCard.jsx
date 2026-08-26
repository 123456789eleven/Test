import { useMemo } from "react";
import { buildWorkflowGraph, getBranches } from "./workflowPath";
import { describeStepOwner } from "../orgTree";

// The real, sourced owner label for a step — same 3-tier priority as the
// scene's resolveStepLocation (function -> stakeholder -> unresolved), just
// rendered as a badge instead of a 3D hop. Renders an honest "Not yet
// linked" for the steps that really are unresolved (27 of 56 real COBRA
// steps, per the workflow-buildout skill's own migration notes) rather than
// hiding the gap or inventing an owner.
function StepOwnerBadge({ step, tasksById, functionsById, sceneState, externalNodesById }) {
  const owner = describeStepOwner(step, { tasksById, functionsById, sceneState, externalNodesById });
  if (!owner) return <span className="wf-card-badge wf-card-badge-unresolved">Not yet linked</span>;
  return <span className={`wf-card-badge${owner.external ? " wf-card-badge-external" : ""}`}>{owner.label}</span>;
}

// A structural, read-the-whole-thing-at-once overview of one real workflow —
// every step in its real step_order, each labeled with who owns it and
// whether it's a real decision branch, plus its real outgoing transition(s)
// inline. Complements (doesn't replace) the existing 3D "▶ Play" simulation
// and "show full path" line overlay: those are the immersive/spatial reads,
// this is the flat, skimmable one, for when you just want to read the
// process like a document instead of watching it move.
export default function WorkflowCard({ workflow, steps, transitions, tasksById, functionsById, sceneState, externalNodesById, onClose }) {
  // workflow_steps/transitions rows carry no per-call filter today (only one
  // real workflow exists, so every consumer gets the full table) -- filtering
  // here by the real workflow_id keeps this card correct once a second real
  // workflow exists, rather than silently assuming every row passed in
  // belongs to whichever one is open.
  const ownSteps = useMemo(
    () => (steps || []).filter((s) => s.workflow_id === workflow.id).sort((a, b) => a.step_order - b.step_order),
    [steps, workflow.id]
  );
  const ownStepIds = useMemo(() => new Set(ownSteps.map((s) => s.id)), [ownSteps]);
  const ownTransitions = useMemo(
    () => (transitions || []).filter((t) => ownStepIds.has(t.from_step_id)),
    [transitions, ownStepIds]
  );
  const graph = useMemo(() => buildWorkflowGraph(ownSteps, ownTransitions), [ownSteps, ownTransitions]);

  return (
    <div className="holo-workflow-card-backdrop" onClick={onClose}>
      <div className="holo-detail holo-workflow-card" key={workflow.id} onClick={(e) => e.stopPropagation()}>
        <button className="holo-detail-close" type="button" onClick={onClose}>✕</button>
        <h4>{workflow.name}</h4>
        {workflow.trigger_description ? <p className="wf-card-meta"><strong>Trigger:</strong> {workflow.trigger_description}</p> : null}
        {workflow.outcome_description ? <p className="wf-card-meta"><strong>Outcome:</strong> {workflow.outcome_description}</p> : null}

        <ol className="wf-card-steps">
          {ownSteps.map((step) => {
            // Branch/decision detection uses the real transition count, not
            // just the is_decision_point flag alone -- more accurate (see
            // useWorkflowSimulation's own header comment: a step can be
            // flagged is_decision_point but only have one real recorded
            // outgoing transition).
            const branches = getBranches(graph, step.id);
            const isDecision = branches.length > 1;
            return (
              <li className="wf-card-step" key={step.id}>
                <div className="wf-card-step-badges">
                  <span className="wf-card-badge wf-card-badge-order">Step {step.step_order}</span>
                  {isDecision ? <span className="wf-card-badge wf-card-badge-decision">⚡ Decision</span> : null}
                  <StepOwnerBadge step={step} tasksById={tasksById} functionsById={functionsById} sceneState={sceneState} externalNodesById={externalNodesById} />
                </div>
                <div className="wf-card-step-title">{step.title}</div>
                {step.description ? <p className="wf-card-step-desc">{step.description}</p> : null}
                {branches.length ? (
                  <ul className="wf-card-branches">
                    {branches.map((b) => {
                      const dest = graph.stepsById.get(b.to_step_id);
                      const text = b.condition_label || dest?.title || "Continue";
                      return <li key={b.id}>→ {text}{dest ? ` (Step ${dest.step_order})` : ""}</li>;
                    })}
                  </ul>
                ) : (
                  <p className="wf-card-branches-empty">End of workflow.</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
