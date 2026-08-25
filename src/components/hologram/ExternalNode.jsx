import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildExternalNodes } from "./orgTree";

// External-stakeholder node -- same hand-rolled mount/hover lerp technique as
// Node.jsx (no tween library, ref-based ease-in-on-mount + hover-scale-bump
// lerp), but drawn with a different geometry and a color outside the org
// palette (GLOW/SHARED_GLOW/QUIET/PEOPLE_GLOW, all in orgTree.js) so the four
// external nodes read at a glance as "outside the company," not another
// department. A tetrahedron next to Node.jsx's octahedron is a big enough
// silhouette change to spot even at a distance or small scale; a muted
// violet keeps the family "warm" without colliding with SHARED_GLOW's amber
// or PEOPLE_GLOW's blue-lavender.
//
// buildExternalNodes() only returns {id, name, type, kind, position} -- no
// size/color/opacity like tier nodes carry, since all four external nodes
// are visually identical to each other (there's no per-node connectivity/
// tier state to reflect in color the way org nodes have). Those visual
// constants live here instead.
const EXTERNAL_SIZE = 0.46;
const EXTERNAL_COLOR = 0xb46bff;
const EXTERNAL_OPACITY = 0.36;

export default function ExternalNode({ node, hoveredId, onHover, onUnhover, onMove, onClick }) {
  const { id, position } = node;
  const groupRef = useRef(null);
  const mountedAtRef = useRef(null);
  if (mountedAtRef.current === null) mountedAtRef.current = performance.now();
  const isHovered = hoveredId === id;

  const geometry = useMemo(() => new THREE.TetrahedronGeometry(EXTERNAL_SIZE, 0), []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const elapsed = performance.now() - mountedAtRef.current;
    const growIn = Math.min(1, elapsed / 260);
    const eased = 1 - Math.pow(1 - growIn, 3);
    const target = eased * (isHovered ? 1.12 : 1);
    const next = g.scale.x + (target - g.scale.x) * 0.25;
    g.scale.set(next, next, next);
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
    <group ref={groupRef} position={position} scale={0}>
      <mesh
        geometry={geometry}
        onPointerOver={(e) => { e.stopPropagation(); onHover(node, e); }}
        onPointerMove={(e) => { e.stopPropagation(); onMove(node, e); }}
        onPointerOut={(e) => { e.stopPropagation(); onUnhover(node); }}
      >
        <meshBasicMaterial
          color={EXTERNAL_COLOR}
          transparent
          opacity={isHovered ? Math.min(1, EXTERNAL_OPACITY + 0.25) : EXTERNAL_OPACITY}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color={EXTERNAL_COLOR} transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
}

// The piece meant to actually get imported into Scene.jsx: takes the raw
// stakeholder rows straight off useExternalStakeholders() and renders all
// four external nodes, calling buildExternalNodes() itself so the caller
// never has to. Mirrors ExternalNode's hover/click prop contract one level
// up so it drops in next to the org tiers with the same wiring shape.
export function ExternalNodes({ stakeholders, hoveredId, onHover, onUnhover, onMove, onClick }) {
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
        />
      ))}
    </>
  );
}
