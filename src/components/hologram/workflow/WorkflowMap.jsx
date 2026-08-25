import { useMemo } from "react";
import { QuadraticBezierLine } from "@react-three/drei";
import { resolveStepLocation, GLOW } from "../orgTree";

// A static overlay of every real workflow_transitions row at once, instead
// of a single pulse you have to watch travel step by step — "show me the
// whole path" for a process, not a moving dot. Deliberately reuses the exact
// same resolution rule as the live pulse (resolveStepLocation, which falls
// back to whatever tier is currently expanded) rather than forcing every
// touched department open simultaneously: that would mean computing a
// second, parallel "virtually expanded" position system independent of the
// real accordion state, which is a much larger, riskier change than this
// pass calls for. The honest tradeoff, surfaced in the UI copy in
// WorkflowControls rather than hidden: with nothing drilled in, most hops
// resolve to the same one or two division-level nodes (coarse but real);
// drilling into the department a workflow actually lives in reveals the
// real step-by-step detail, the same way hovering/clicking already works
// everywhere else in this scene.
export default function WorkflowMap({ steps, transitions, tasksById, sceneState, nodesById, externalNodesById }) {
  const arcs = useMemo(() => {
    if (!sceneState || !nodesById || !steps || !transitions) return [];
    const stepsById = new Map(steps.map((s) => [s.id, s]));
    const seen = new Set();
    const out = [];
    transitions.forEach((t) => {
      const fromStep = stepsById.get(t.from_step_id);
      const toStep = stepsById.get(t.to_step_id);
      if (!fromStep || !toStep) return;
      const from = resolveStepLocation(fromStep, { tasksById, sceneState, nodesById, externalNodesById });
      const to = resolveStepLocation(toStep, { tasksById, sceneState, nodesById, externalNodesById });
      if (from.kind === "unresolved" || to.kind === "unresolved") return;
      if (from.nodeId === to.nodeId) return; // both ends resolved to the same on-screen node — nothing to draw
      const key = [from.nodeId, to.nodeId].sort().join("|") + `|${t.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const mid = [
        (from.position[0] + to.position[0]) / 2,
        Math.max(from.position[1], to.position[1]) + 0.5,
        (from.position[2] + to.position[2]) / 2,
      ];
      out.push({ id: t.id, from: from.position, to: to.position, mid });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, transitions, tasksById, sceneState, nodesById, externalNodesById]);

  return (
    <>
      {arcs.map((arc) => (
        <QuadraticBezierLine
          key={arc.id}
          start={arc.from}
          end={arc.to}
          mid={arc.mid}
          color={GLOW}
          lineWidth={1.1}
          transparent
          opacity={0.35}
        />
      ))}
    </>
  );
}
