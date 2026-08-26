import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import NodeLabel from "./NodeLabel";

// Deterministic per-node phase so idle breathing (scale/opacity/rim glow)
// falls out of sync between nodes instead of pulsing in lockstep -- the same
// char-code-sum trick ConnectionLines.jsx uses for its line phases, keyed on
// each node's own stable id so it stays put across re-renders.
function phaseOf(key) {
  let phase = 0;
  for (let i = 0; i < key.length; i++) phase += key.charCodeAt(i);
  return phase;
}

// Idle breathing tuning. There's no shared scanT clock available here (that
// ref lives in Scene.jsx and is only threaded to ConnectionLines/ScanRing),
// so nodes run their own local clock off performance.now(). BREATH_SPEED is
// picked to land close to ConnectionLines' scanT-driven pulse period (~7s)
// so the whole scene reads as one ambient rhythm rather than two unrelated
// clocks drifting past each other.
const BREATH_SPEED = 0.85; // rad/s
const BREATH_SCALE_AMOUNT = 0.035; // +/-3.5% scale wobble
const BREATH_OPACITY_LOW = 0.85;
const BREATH_OPACITY_RANGE = 0.15;
const RIM_LOW = 0.7;
const RIM_RANGE = 0.5;

// Fresnel/rim-light shader: brightens at grazing angles (the silhouette
// edge, where the surface normal points nearly perpendicular to the view
// direction) and dims on faces pointing straight at the camera. Layered on
// top of the existing fill + wireframe as its own additive mesh rather than
// replacing either -- the fill stays an unlit meshBasicMaterial on purpose
// (a lit material risks losing the reliable bloom-regardless-of-angle look
// the unlit fill was chosen for), so the rim glow is the only place actual
// per-pixel shading happens, giving the node real dimensional depth without
// touching the fill/wireframe combo at all.
const RIM_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RIM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 glowColor;
  uniform float power;
  uniform float intensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), power);
    float a = fresnel * intensity;
    gl_FragColor = vec4(glowColor * a, a);
  }
`;

// A single tier's octahedron node — fill + rim-glow shell + wireframe edges,
// built on top of the old makeNode() look. Enhancement over the original
// (which just popped nodes in instantly via nodeLayer.add()): eases scale in
// from 0 on mount, bumps scale/opacity slightly on hover, and — unless
// reduceMotion is set — breathes gently at rest, all via simple per-frame
// lerps/sines instead of a tween library, none of it touching the
// interaction model (still the same click → toggle/detail routing).
export default function Node({ node, hoveredId, onHover, onUnhover, onMove, onClick, reduceMotion = false }) {
  const { id, size, color, opacity, position, name, tier, isPerson, kind, showLabel = true } = node;
  const groupRef = useRef(null);
  const matRef = useRef(null);
  const mountedAtRef = useRef(null);
  if (mountedAtRef.current === null) mountedAtRef.current = performance.now();
  const isHovered = hoveredId === id;
  const isDepartment = kind === "vertical";

  // Departments (verticals) get a distinct box shape -- previously identical
  // to every other node (an octahedron), which is exactly why a division's
  // real departments and its real people/teams read as "the same kind of
  // thing" once both showed up at the same tier. A cube reads as a
  // structural container; people/teams keep the octahedron, matching
  // Corporate Functions' own look exactly.
  const geometry = useMemo(
    () => (isDepartment ? new THREE.BoxGeometry(size * 1.15, size * 1.15, size * 1.15) : new THREE.OctahedronGeometry(size, 0)),
    [size, isDepartment]
  );
  const phase = useMemo(() => phaseOf(id), [id]);
  const rimUniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      power: { value: 2.6 },
      intensity: { value: RIM_LOW },
    }),
    [color]
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const elapsed = performance.now() - mountedAtRef.current;
    const growIn = Math.min(1, elapsed / 260);
    const eased = 1 - Math.pow(1 - growIn, 3);
    const hoverScale = isHovered ? 1.12 : 1;
    const flatOpacity = isHovered ? Math.min(1, opacity + 0.25) : opacity;
    const rimBase = isHovered ? 1.35 : 1;

    // Idle breathing: one slow sine drives scale wobble, fill-opacity pulse,
    // and rim intensity together so they read as a single ambient rhythm
    // rather than three uncoordinated effects. Phase-shifted per node so
    // the whole scene doesn't pulse in unison. Fully inert under
    // reduceMotion — scale/opacity/rim all settle flat exactly as they did
    // before this feature existed.
    const s = reduceMotion ? 0 : Math.sin(performance.now() * 0.001 * BREATH_SPEED + phase);
    const pulse = 0.5 + 0.5 * s;

    const target = eased * hoverScale * (1 + BREATH_SCALE_AMOUNT * s);
    const next = g.scale.x + (target - g.scale.x) * 0.25;
    g.scale.set(next, next, next);

    if (matRef.current) {
      matRef.current.opacity = reduceMotion
        ? flatOpacity
        : flatOpacity * (BREATH_OPACITY_LOW + BREATH_OPACITY_RANGE * pulse);
    }

    rimUniforms.intensity.value = rimBase * (reduceMotion ? RIM_LOW : RIM_LOW + RIM_RANGE * pulse);
  });

  return (
    <>
      <group ref={groupRef} position={position} scale={0}>
        <mesh
          geometry={geometry}
          onPointerOver={(e) => { e.stopPropagation(); onHover(node, e); }}
          onPointerMove={(e) => { e.stopPropagation(); onMove(node, e); }}
          onPointerOut={(e) => { e.stopPropagation(); onUnhover(node); }}
          onClick={(e) => { e.stopPropagation(); onClick(node); }}
        >
          <meshBasicMaterial ref={matRef} color={color} transparent opacity={isHovered ? Math.min(1, opacity + 0.25) : opacity} />
        </mesh>
        {/* Rim-glow shell: same geometry, additive shader on top, no pointer
            events of its own (raycast disabled) so it doesn't shadow the
            fill mesh's hover/click handling above. */}
        <mesh geometry={geometry} raycast={() => null} renderOrder={1}>
          <shaderMaterial
            args={[{ uniforms: rimUniforms }]}
            vertexShader={RIM_VERTEX_SHADER}
            fragmentShader={RIM_FRAGMENT_SHADER}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <lineSegments renderOrder={2}>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color={color} transparent opacity={0.9} />
        </lineSegments>
      </group>
      {/* Rendered as a sibling, not a child of the group above -- drei's <Html>
          doesn't play well with a parent that's actively being scaled (the
          0->1 mount-in animation), so the label reads position directly
          rather than inheriting the group's transform. Suppressed once a
          batch is genuinely dense (showLabel:false, set in orgTree.js) --
          hover still shows the name either way via HoverLabel; this only
          drops the always-on floating badge once there are too many at once
          to read cleanly. */}
      {showLabel ? (
        <NodeLabel
          position={position}
          yOffset={size + 0.15}
          text={name}
          tier={isPerson ? 2 : tier}
          dim={isHovered}
          variant={isDepartment ? "department" : "default"}
        />
      ) : null}
    </>
  );
}
