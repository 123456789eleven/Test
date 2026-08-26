import { useEffect, useState } from "react";

// Surfaces the real "process improvement" annotations that live in
// public/data/cobra-process.json but were deliberately left out of the
// workflow_steps/workflow_transitions Supabase migration (see PLAN.md) —
// they're real, sourced content, just never carried into the new schema.
//
// The JSON has no explicit id per step, but the original migration walked
// phases[].steps[] — recursing into branches[].steps[] for decision steps —
// in that exact document order and assigned workflow_steps.step_order
// sequentially, 1..56, in that same walk order. This module re-walks the
// JSON the identical way to rebuild that same order, so "the Nth step
// visited here" lines up with the real DB row where step_order = N.
//
// Verified, not assumed: every one of the 56 live `workflow_steps` rows
// (fetched via the REST API, ordered by step_order) has a title that matches
// the step text at that same position in this walk, for the full table —
// not just a handful of spot checks. Five steps in the source document carry
// a real `improve` field; they land at step_order 10, 18, 33, 37, and 53.

function walkSteps(steps, order, out) {
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    order.n += 1;
    if (step.improve) out.set(order.n, step.improve);
    if (step.type === "decision" && Array.isArray(step.branches)) {
      for (const branch of step.branches) walkSteps(branch.steps, order, out);
    }
  }
}

function buildImprovementByStepOrder(data) {
  const out = new Map();
  const order = { n: 0 };
  (data.phases || []).forEach((phase) => walkSteps(phase.steps, order, out));
  return out;
}

// Singleton fetch — every WorkflowStepInfo instance (there's only ever one
// on screen, but this holds even if that changes) shares the one parse of
// the source document rather than each re-fetching it.
let lensPromise = null;
function loadLens() {
  if (!lensPromise) {
    lensPromise = fetch(`${import.meta.env.BASE_URL}data/cobra-process.json`)
      .then((r) => r.json())
      .then((data) => ({
        concepts: data.improvementConcepts || {},
        byStepOrder: buildImprovementByStepOrder(data),
      }))
      .catch(() => ({ concepts: {}, byStepOrder: new Map() }));
  }
  return lensPromise;
}

// Loads once and re-renders whichever component asked once the fetch
// resolves; returns null before that (callers already handle "nothing to
// show yet" the same way they handle "no improve on this step").
export function useImprovementLens() {
  const [lens, setLens] = useState(null);
  useEffect(() => {
    let alive = true;
    loadLens().then((loaded) => {
      if (alive) setLens(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);
  return lens;
}

// Pure lookup: real step_order in, either null (nothing recorded for this
// step — the normal case, only 5 of 56 have one) or the real note/ask plus
// the matching concept's real label/definition.
export function getImprovementForStep(lens, stepOrder) {
  if (!lens || stepOrder == null) return null;
  const improve = lens.byStepOrder.get(stepOrder);
  if (!improve) return null;
  const concept = lens.concepts[improve.concept] || null;
  return {
    concept: improve.concept,
    label: concept?.label || improve.concept,
    def: concept?.def || null,
    note: improve.note,
    ask: improve.ask,
  };
}
