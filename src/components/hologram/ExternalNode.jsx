import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildExternalNodes } from "./orgTree";
import NodeLabel from "./NodeLabel";

// External-stakeholder node -- same hand-rolled mount/hover lerp technique as
// Node.jsx (no tween library, ref-based ease-in-on-mount + hover-scale-bump
// lerp), plus the same idle-breathing pulse and fresnel rim-glow shell (see
// Node.jsx for the fuller rationale on why the fill stays an unlit
// meshBasicMaterial and the rim glow lives on a separate additive mesh
// instead), but drawn with a different geometry and a deliberate third color
// family (see orgTree.js's palette comment: violet for GLOW/PEOPLE_GLOW,
// amber for SHARED_GLOW/MANAGER_GLOW) so the four external nodes read at a
// glance as "outside the company," not another department. A tetrahedron
// next to Node.jsx's octahedron is a big enough silhouette change to spot
// even at a distance or small scale. Warm copper rather than --warn's red --
// external partners aren't an error/warning, just a different domain.
//
// buildExternalNodes() only returns {id, name, type, kind, position} -- no
// size/color/opacity like tier nodes carry, since all four external nodes
// are visually identical to each other (there's no per-node connectivity/
// tier state to reflect in color the way org nodes have). Those visual
// constants live here instead.
const EXTERNAL_SIZE = 0.46;
const EXTERNAL_COLOR = 0xd68c4a;
// Raised from 0.36 -- same uniform-fill-opacity issue as org nodes (see
// orgTree.js's place() for the full rationale): the fill has no fresnel
// weighting of its own, so a low flat value here just reads as "barely
// there" rather than "hologram." The already-fresnel-weighted rim shell
// below carries the edge glow/fade; this fill's job is a legible body.
const EXTERNAL_OPACITY = 0.9;

// Deterministic per-node phase, same char-code-sum trick as Node.jsx/
// ConnectionLines.jsx, keyed on the node's own stable id.
function phaseOf(key) {
  let phase = 0;
  for (let i = 0; i < key.length; i++) phase += key.charCodeAt(i);
  return phase;
}

// Idle breathing tuning -- kept identical to Node.jsx's so org and external
// nodes read as the same living scene rather than two different rhythms.
const BREATH_SPEED = 0.85; // rad/s
const BREATH_SCALE_AMOUNT = 0.035;
const BREATH_OPACITY_LOW = 0.85;
const BREATH_OPACITY_RANGE = 0.15;
const RIM_LOW = 0.7;
const RIM_RANGE = 0.5;

// Fresnel/rim-light shader -- identical technique to Node.jsx's (see that
// file for the full rationale): brightens at grazing angles, dims head-on,
// layered on top of the fill/wireframe as its own additive, non-interactive
// mesh.
const RIM_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPos = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Same scanline + grain extension as Node.jsx's rim shader -- see that file
// for the full rationale. External nodes have no "expanded" concept of
// their own (they're never expandable), so `signal` here is driven by hover
// alone.
const RIM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 glowColor;
  uniform float power;
  uniform float intensity;
  uniform float time;
  uniform float signal;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), power);

    // Restored to the round-1 amplitudes -- see Node.jsx's matching comment.
    float scanSpeed = mix(0.6, 1.8, signal);
    float scan = sin(vLocalPos.y * 18.0 - time * scanSpeed) * 0.5 + 0.5;
    float scanline = 0.85 + 0.15 * scan;

    float grain = hash(gl_FragCoord.xy * 0.75 + time);
    float noise = 0.92 + 0.08 * grain;

    float a = fresnel * intensity * scanline * noise;
    gl_FragColor = vec4(glowColor * a, a);
  }
`;

export default function ExternalNode({ node, hoveredId, onHover, onUnhover, onMove, onClick, reduceMotion = false }) {
  const { id, position } = node;
  const groupRef = useRef(null);
  const matRef = useRef(null);
  const mountedAtRef = useRef(null);
  if (mountedAtRef.current === null) mountedAtRef.current = performance.now();
  const isHovered = hoveredId === id;

  const geometry = useMemo(() => new THREE.TetrahedronGeometry(EXTERNAL_SIZE, 0), []);
  const phase = useMemo(() => phaseOf(id), [id]);
  const rimUniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(EXTERNAL_COLOR) },
      power: { value: 2.6 },
      intensity: { value: RIM_LOW },
      time: { value: 0 },
      signal: { value: 0 },
    }),
    []
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const elapsed = performance.now() - mountedAtRef.current;
    const growIn = Math.min(1, elapsed / 260);
    const eased = 1 - Math.pow(1 - growIn, 3);
    const hoverScale = isHovered ? 1.12 : 1;
    const flatOpacity = isHovered ? Math.min(1, EXTERNAL_OPACITY + 0.25) : EXTERNAL_OPACITY;
    const rimBase = isHovered ? 1.35 : 1;

    // Idle breathing -- see Node.jsx for the full rationale. Same technique,
    // own local clock (no shared scanT reaches this file), phase-shifted per
    // node, fully inert under reduceMotion.
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
    rimUniforms.time.value = reduceMotion ? 0 : performance.now() * 0.001;
    rimUniforms.signal.value = isHovered ? 1 : 0;
  });

  // Deliberately no click-to-expand: external nodes have no children and
  // aren't part of the org accordion, so a click should do nothing. onClick
  // is still accepted here (kept in the signature for prop-shape parity with
  // Node.jsx, in case whoever wires the scene wants to treat both kinds of
  // node uniformly) but is never invoked. Hover/move/unhover still fire with
  // the full node object -- id, name, and type included -- so whatever
  // hoveredId-driven label UI the scene already uses for org nodes can show
  // the stakeholder's real name/type on hover the same way, without a
  // separate tooltip needing to be built here.
  return (
    <>
      <group ref={groupRef} position={position} scale={0}>
        <mesh
          geometry={geometry}
          onPointerOver={(e) => { e.stopPropagation(); onHover(node, e); }}
          onPointerMove={(e) => { e.stopPropagation(); onMove(node, e); }}
          onPointerOut={(e) => { e.stopPropagation(); onUnhover(node); }}
        >
          <meshBasicMaterial
            ref={matRef}
            color={EXTERNAL_COLOR}
            transparent
            opacity={isHovered ? Math.min(1, EXTERNAL_OPACITY + 0.25) : EXTERNAL_OPACITY}
          />
        </mesh>
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
          <lineBasicMaterial color={EXTERNAL_COLOR} transparent opacity={0.9} />
        </lineSegments>
      </group>
      {/* Sibling, not a child of the scaling group above — see Node.jsx for why. */}
      <NodeLabel position={position} yOffset={EXTERNAL_SIZE + 0.15} text={node.name} tier={2} dim={isHovered} />
    </>
  );
}

// The piece meant to actually get imported into Scene.jsx: takes the raw
// stakeholder rows straight off useExternalStakeholders() and renders all
// four external nodes, calling buildExternalNodes() itself so the caller
// never has to. Mirrors ExternalNode's hover/click prop contract one level
// up so it drops in next to the org tiers with the same wiring shape.
export function ExternalNodes({ stakeholders, hoveredId, onHover, onUnhover, onMove, onClick, reduceMotion }) {
  const nodes = buildExternalNodes(stakeholders);
  return (
    <>
      {nodes.map((node) => (
        <ExternalNode
          key={node.id}
          node={node}
          hoveredId={hoveredId}
          onHover={onHover}
          onUnhover={onUnhover}
          onMove={onMove}
          onClick={onClick}
          reduceMotion={reduceMotion}
        />
      ))}
    </>
  );
}
