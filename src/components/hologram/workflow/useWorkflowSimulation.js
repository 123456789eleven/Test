import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWorkflowGraph, getBranches } from "./workflowPath";

// The shared contract every workflow-animation piece builds against: this
// hook owns ONLY "which step are we on and what are the options from here" —
// deliberately no awareness of 3D positions or the org tree at all, so it
// stays a plain state machine over the real workflow_steps/workflow_transitions
// graph. Resolving a step to a scene position is the animation layer's job
// (resolveStepLocation in orgTree.js), not this hook's.
//
// Non-decision steps auto-advance after `dwellMs` (long enough to read the
// step's real title before moving on). Decision steps (workflow_steps.
// is_decision_point, or simply having more than one real outgoing
// transition) stop and wait for an explicit chooseBranch() — a real choice,
// not a timed guess, since the whole point of this feature is to make the
// branching legible, not to play a slideshow.
export function useWorkflowSimulation(steps, transitions, { dwellMs = 1800 } = {}) {
  const graph = useMemo(() => buildWorkflowGraph(steps, transitions), [steps, transitions]);

  const [status, setStatus] = useState("idle"); // idle | playing | at-decision | done
  const [currentStepId, setCurrentStepId] = useState(null);
  const dwellTimer = useRef(null);

  const clearDwell = useCallback(() => {
    if (dwellTimer.current) { clearTimeout(dwellTimer.current); dwellTimer.current = null; }
  }, []);

  // Lands on a step and decides what happens next: real branch -> pause and
  // wait; single real next step -> auto-advance after a dwell; no outgoing
  // transitions at all -> the workflow is genuinely finished.
  const settleOnStep = useCallback((stepId) => {
    setCurrentStepId(stepId);
    const branches = getBranches(graph, stepId);
    if (branches.length > 1) {
      setStatus("at-decision");
      return;
    }
    setStatus("playing");
    if (branches.length === 1) {
      clearDwell();
      dwellTimer.current = setTimeout(() => settleOnStepRef.current(branches[0].to_step_id), dwellMs);
    } else {
      // No outgoing transitions — real end of the workflow, not a dead end
      // to paper over.
      clearDwell();
      dwellTimer.current = setTimeout(() => setStatus("done"), dwellMs);
    }
  }, [graph, dwellMs, clearDwell]);

  // settleOnStep recurses through a timer, not a direct call, so it needs a
  // stable ref to itself rather than closing over a version of itself that's
  // about to be replaced on the next render.
  const settleOnStepRef = useRef(settleOnStep);
  useEffect(() => { settleOnStepRef.current = settleOnStep; }, [settleOnStep]);

  useEffect(() => () => clearDwell(), [clearDwell]);

  const play = useCallback(() => {
    if (status === "playing" || status === "at-decision") return;
    if (!graph.startStepId) return;
    settleOnStep(graph.startStepId);
  }, [status, graph, settleOnStep]);

  const reset = useCallback(() => {
    clearDwell();
    setStatus("idle");
    setCurrentStepId(null);
  }, [clearDwell]);

  const chooseBranch = useCallback((transitionId) => {
    if (status !== "at-decision") return;
    const branches = getBranches(graph, currentStepId);
    const chosen = branches.find((b) => b.id === transitionId);
    if (chosen) settleOnStep(chosen.to_step_id);
  }, [status, graph, currentStepId, settleOnStep]);

  const currentStep = currentStepId ? graph.stepsById.get(currentStepId) || null : null;
  const availableBranches = status === "at-decision" ? getBranches(graph, currentStepId) : [];

  return { status, currentStepId, currentStep, availableBranches, play, reset, chooseBranch, graph };
}
