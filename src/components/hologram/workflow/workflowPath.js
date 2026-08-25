// Pure, React/Three-agnostic logic for turning real workflow_steps +
// workflow_transitions rows into a traversable graph. Kept free of any
// rendering or state-machine concerns, same philosophy as orgTree.js —
// the shape of the workflow can be read (and checked) on its own.

// Builds a lookup graph from the flat rows react-query hands back.
// startStepId is whichever step has no incoming transition (the real start
// of the process) — falls back to the lowest step_order if that's ever
// ambiguous (e.g. a workflow with more than one true entry point), rather
// than throwing.
export function buildWorkflowGraph(steps, transitions) {
  const stepsById = new Map();
  (steps || []).forEach((s) => stepsById.set(s.id, s));

  const outgoingByStepId = new Map();
  const hasIncoming = new Set();
  (transitions || []).forEach((t) => {
    if (!outgoingByStepId.has(t.from_step_id)) outgoingByStepId.set(t.from_step_id, []);
    outgoingByStepId.get(t.from_step_id).push(t);
    hasIncoming.add(t.to_step_id);
  });

  const ordered = [...stepsById.values()].sort((a, b) => a.step_order - b.step_order);
  const entryPoints = ordered.filter((s) => !hasIncoming.has(s.id));
  const startStepId = (entryPoints[0] || ordered[0] || {}).id || null;

  return { stepsById, outgoingByStepId, startStepId };
}

// Returns this step's real outgoing transitions, in a stable, deterministic
// order (workflow_transitions has no explicit order column, so this sorts by
// the destination step's own step_order — the closest real signal to "which
// branch reads first" without inventing one). Length 0 = end of workflow,
// length 1 = a normal single next step, length > 1 = a real decision branch.
export function getBranches(graph, stepId) {
  const transitions = graph.outgoingByStepId.get(stepId) || [];
  return [...transitions].sort((a, b) => {
    const stepA = graph.stepsById.get(a.to_step_id), stepB = graph.stepsById.get(b.to_step_id);
    return (stepA?.step_order ?? 0) - (stepB?.step_order ?? 0);
  });
}
