import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Deterministic per-line phase so each connection pulses out of sync with
// the others rather than in unison — same char-code-sum trick the original
// used, keyed on the same "a|b" pair id so a line's phase stays stable
// across re-renders as long as its endpoints don't change.
function phaseOf(key) {
  let phase = 0;
  for (let i = 0; i < key.length; i++) phase += key.charCodeAt(i);
  return phase;
}

function ConnectionLine({ line, baseOpacity, reduceMotion, scanT }) {
  const matRef = useRef(null);
  const phase = useMemo(() => phaseOf(line.key), [line.key]);

  const geometry = useMemo(() => {
    const from = new THREE.Vector3(...line.from);
    const to = new THREE.Vector3(...line.to);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.5;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.from[0], line.from[1], line.from[2], line.to[0], line.to[1], line.to[2]]);

  useFrame(() => {
    const m = matRef.current;
    if (!m) return;
    if (reduceMotion) {
      m.opacity = baseOpacity;
      return;
    }
    m.opacity = baseOpacity * (0.7 + 0.3 * Math.sin(scanT.current * 2.4 + phase));
  });

  return (
    <line geometry={geometry}>
      <lineBasicMaterial ref={matRef} color={line.color} transparent opacity={baseOpacity} />
    </line>
  );
}

// Every connection line resolved to whatever tier is currently visible for
// each endpoint (see orgTree.computeVisibleNodes). Hover highlighting is
// purely derived here from hoveredId — no imperative mutation needed, React
// just re-renders the affected lines' baseOpacity like everything else.
export default function ConnectionLines({ lines, hoveredId, reduceMotion, scanT }) {
  return (
    <group>
      {lines.map((line) => {
        const baseOpacity = !hoveredId ? 0.8 : [line.a, line.b].includes(hoveredId) ? 1 : 0.08;
        return <ConnectionLine key={line.key} line={line} baseOpacity={baseOpacity} reduceMotion={reduceMotion} scanT={scanT} />;
      })}
    </group>
  );
}
