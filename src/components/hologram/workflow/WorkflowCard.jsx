import { useMemo } from "react";
import { buildWorkflowGraph, getBranches } from "./workflowPath";
import { describeStepOwner, resolveStepFunctionId } from "../orgTree";

// The real, sourced owner label for a step — same 3-tier priority as the
// scene's resolveStepLocation (function -> stakeholder -> unresolved). Takes
// an already-resolved `owner` (see groupStepsByOwner below, which resolves it
// once per step and reuses it for both the group header and this badge,
// rather than calling describeStepOwner twice per step). Renders an honest
// "Not yet linked" for the steps that really are unresolved (27 of 56 real
// COBRA steps, per the workflow-buildout skill's own migration notes) rather
// than hiding the gap or inventing an owner.
function StepOwnerBadge({ owner }) {
  if (!owner) return <span className="wf-card-badge wf-card-badge-unresolved">Not yet linked</span>;
  return <span className={`wf-card-badge${owner.external ? " wf-card-badge-external" : ""}`}>{owner.label}</span>;
}

// Groups consecutive steps by their real resolved owner (function, or
// external stakeholder, or genuinely unresolved) into runs -- department
// ownership really does move in blocks as a real process crosses from one
// person/department to the next, so this is surfacing structure already
// present in the data, not inventing any. Grouping key is the underlying
// resolved id (resolveStepFunctionId / stakeholder_id), not the display
// label, so two different owners that happen to share display text are never
// merged into one run.
function groupStepsByOwner(ownSteps, ownerCtx) {
  const groups = [];
  let current = null;
  ownSteps.forEach((step) => {
    const owner = describeStepOwner(step, ownerCtx);
    const key = resolveStepFunctionId(step, ownerCtx.tasksById) || (step.stakeholder_id ? `stake:${step.stakeholder_id}` : "unresolved");
    if (!current || current.key !== key) {
      current = { key, owner, steps: [] };
      groups.push(current);
    }
    current.steps.push({ step, owner });
  });
  return groups;
}

// A structural, read-the-whole-thing-at-once overview of one real workflow —
// every step in its real step_order, grouped by whichever real owner runs a
// consecutive block of them, each labeled with a decision flag where real
// branches exist, plus its real outgoing transition(s) inline. Complements
// (doesn't replace) the existing 3D "▶ Play" simulation and "show full path"
// line overlay: those are the immersive/spatial reads, this is the
// structured, skimmable one, for when you just want to read the process like
// a document instead of watching it move.
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
  const groups = useMemo(
    () => groupStepsByOwner(ownSteps, { tasksById, functionsById, sceneState, externalNodesById }),
    [ownSteps, tasksById, functionsById, sceneState, externalNodesById]
  );

  return (
    <div className="holo-workflow-card-backdrop" onClick={onClose}>
      <div className="holo-detail holo-workflow-card" key={workflow.id} onClick={(e) => e.stopPropagation()}>
        <button className="holo-detail-close" type="button" onClick={onClose}>✕</button>
        <h4>{workflow.name}</h4>
        {workflow.trigger_description ? <p className="wf-card-meta"><strong>Trigger:</strong> {workflow.trigger_description}</p> : null}
        {workflow.outcome_description ? <p className="wf-card-meta"><strong>Outcome:</strong> {workflow.outcome_description}</p> : null}

        <div className="wf-card-groups">
          {groups.map((group) => {
            const unresolved = !group.owner;
            const external = !!group.owner?.external;
            const headerClass = unresolved
              ? "wf-card-group-header wf-card-group-header-unresolved"
              : external
              ? "wf-card-group-header wf-card-group-header-external"
              : "wf-card-group-header";
            return (
              <section className="wf-card-group" key={group.steps[0].step.id}>
                <div className={headerClass}>
                  <span className="wf-card-group-owner">{unresolved ? "Not yet linked" : group.owner.label}</span>
                  <span className="wf-card-group-count">{group.steps.length} step{group.steps.length === 1 ? "" : "s"}</span>
                </div>
                <ol className="wf-card-steps">
                  {group.steps.map(({ step, owner }) => {
                    // Branch/decision detection uses the real transition
                    // count, not just the is_decision_point flag alone --
                    // more accurate (see useWorkflowSimulation's own header
                    // comment: a step can be flagged is_decision_point but
                    // only have one real recorded outgoing transition).
                    const branches = getBranches(graph, step.id);
                    const isDecision = branches.length > 1;
                    const isEnd = branches.length === 0;
                    const dotClass = isDecision
                      ? "wf-card-step-dot wf-card-step-dot-decision"
                      : isEnd
                      ? "wf-card-step-dot wf-card-step-dot-end"
                      : "wf-card-step-dot";
                    return (
                      <li className="wf-card-step" key={step.id}>
                        <div className="wf-card-step-rail">
                          <span className={dotClass}>{step.step_order}</span>
                        </div>
                        <div className="wf-card-step-body">
                          <div className="wf-card-step-badges">
                            {isDecision ? <span className="wf-card-badge wf-card-badge-decision">⚡ Decision</span> : null}
                            <StepOwnerBadge owner={owner} />
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
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
