import { useMemo } from "react";
import * as THREE from "three";
import { resolveManagerLines } from "./orgTree";

// A paler tint of SHARED_GLOW's amber (the app's real --manager token family
// -- see orgTree.js's palette comment) so a manager->report line reads as
// "same family as hierarchy/emphasis, quieter" rather than inventing a
// fourth unrelated hue. Kept clearly distinct from GLOW/PEOPLE_GLOW's violet
// family (process handoffs and person nodes themselves) -- this is a
// different kind of relationship (a real reporting line, not a work
// connection) and shouldn't get confused with either at a glance.
const MANAGER_GLOW = 0xf0c896;

// Deliberately subtle: these lines are meant to read as ambient org
// structure sitting quietly under the primary handoff/shared connections
// (and the workflow pulse), not compete with them for attention. Hovering a
// person traces just their own reporting relationship out of the whole
// cluster -- same "full opacity when relevant, low-but-not-zero otherwise"
// pattern ConnectionLines.jsx uses for regular connections.
const BASE_OPACITY = 0.22;
const HOVER_OPACITY = 1;
const DIM_OPACITY = 0.05;

function ManagerLine({ line, opacity }) {
  const geometry = useMemo(() => {
    const from = new THREE.Vector3(...line.from);
    const to = new THREE.Vector3(...line.to);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.5;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.from[0], line.from[1], line.from[2], line.to[0], line.to[1], line.to[2]]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={MANAGER_GLOW} transparent opacity={opacity} />
    </line>
  );
}

// Real manager->report lines between currently-visible person nodes (see
// orgTree.resolveManagerLines for how pairs are resolved -- both ends must
// already be rendered person nodes, no coarser fallback). `enabled` is a
// plain visibility gate for an external show/hide toggle: false renders
// nothing at all, rather than rendering at zero opacity, so a disabled
// toggle costs nothing per frame.
export default function ManagerLines({ nodesById, hoveredId, enabled }) {
  const lines = useMemo(() => (enabled ? resolveManagerLines(nodesById) : []), [enabled, nodesById]);

  if (!enabled) return null;

  return (
    <group>
      {lines.map((line) => {
        const isRelevant = !!hoveredId && (line.managerId === hoveredId || line.reportId === hoveredId);
        const opacity = !hoveredId ? BASE_OPACITY : isRelevant ? HOVER_OPACITY : DIM_OPACITY;
        return <ManagerLine key={line.key} line={line} opacity={opacity} />;
      })}
    </group>
  );
}
