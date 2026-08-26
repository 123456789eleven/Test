import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Deterministic per-line phase so each connection pulses/flows out of sync
// with the others rather than in unison — same char-code-sum trick the
// original used, keyed on the same "a|b" pair id so a line's phase stays
// stable across re-renders as long as its endpoints don't change.
function phaseOf(key) {
  let phase = 0;
  for (let i = 0; i < key.length; i++) phase += key.charCodeAt(i);
  return phase;
}

// Traveling flow markers: a short comet of fading dots sampled along each
// line's curve, moving from `from` toward `to` -- the real direction of the
// handoff. Tried LineDashedMaterial's dashOffset first, per the obvious
// "lightweight" option for this file's style, but the installed three.js
// (0.185.1) classic-renderer dashed-line shader
// (three/src/renderers/shaders/ShaderLib/linedashed.glsl.js) only reads
// `dashSize`/`gapSize`/`scale` -- there's no dashOffset uniform wired into
// it at all (that property only exists on the WebGPU/TSL node-material
// variant), so animating `material.dashOffset` would silently do nothing on
// the classic renderer this scene actually uses. A small traveling-marker
// mesh sampled via curve.getPointAt (constant-speed arc-length sampling, not
// getPoint's uneven parametric one) sidesteps that entirely and needs no
// shader of its own.
const FLOW_MARKER_GEOMETRY = new THREE.SphereGeometry(0.055, 8, 8);
const FLOW_MARKER_COUNT = 3;
const FLOW_MARKER_GAP = 0.035; // fraction of the curve between trailing echoes
const FLOW_SPEED = 0.5; // ~5-6s for a marker to travel the full curve
// Reused across every line/marker/frame as a getPointAt() write target so
// sampling the curve doesn't allocate a fresh Vector3 per marker per frame
// -- safe because it's read (via .copy) immediately after each write, all
// synchronously within a single frame's useFrame callbacks.
const FLOW_SCRATCH = new THREE.Vector3();

function ConnectionLine({ line, baseOpacity, reduceMotion, scanT }) {
  const matRef = useRef(null);
  const markerRefs = useRef([]);
  const phase = useMemo(() => phaseOf(line.key), [line.key]);
  // A 0..1 per-line start offset derived from the same phase value, so
  // markers scatter around their loop instead of all launching from `from`
  // at once.
  const phaseFrac = useMemo(() => (phase % 1000) / 1000, [phase]);

  const { geometry, curve } = useMemo(() => {
    const from = new THREE.Vector3(...line.from);
    const to = new THREE.Vector3(...line.to);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.5;
    const c = new THREE.QuadraticBezierCurve3(from, mid, to);
    return { geometry: new THREE.BufferGeometry().setFromPoints(c.getPoints(20)), curve: c };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.from[0], line.from[1], line.from[2], line.to[0], line.to[1], line.to[2]]);

  useFrame(() => {
    const m = matRef.current;
    if (m) {
      if (reduceMotion) {
        m.opacity = baseOpacity;
      } else {
        m.opacity = baseOpacity * (0.7 + 0.3 * Math.sin(scanT.current * 2.4 + phase));
      }
    }

    if (reduceMotion) {
      // No dash animation under reduceMotion: hide the markers rather than
      // freezing them mid-line, where a static stray dot would read as a
      // rendering glitch instead of an intentional mark.
      for (const mk of markerRefs.current) if (mk) mk.visible = false;
      return;
    }

    const flowT = ((scanT.current * FLOW_SPEED + phaseFrac) % 1 + 1) % 1;
    for (let i = 0; i < markerRefs.current.length; i++) {
      const mk = markerRefs.current[i];
      if (!mk) continue;
      const ti = ((flowT - i * FLOW_MARKER_GAP) % 1 + 1) % 1;
      curve.getPointAt(ti, FLOW_SCRATCH);
      mk.position.copy(FLOW_SCRATCH);
      mk.visible = true;
      const fade = 1 - i / FLOW_MARKER_COUNT;
      mk.scale.setScalar(1 - i * 0.22);
      if (mk.material) mk.material.opacity = baseOpacity * fade * 0.9;
    }
  });

  return (
    <>
      <line geometry={geometry}>
        <lineBasicMaterial ref={matRef} color={line.color} transparent opacity={baseOpacity} />
      </line>
      {Array.from({ length: FLOW_MARKER_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { markerRefs.current[i] = el; }}
          geometry={FLOW_MARKER_GEOMETRY}
          raycast={() => null}
        >
          <meshBasicMaterial color={line.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
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
