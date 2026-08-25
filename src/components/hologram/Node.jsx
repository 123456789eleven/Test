import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import NodeLabel from "./NodeLabel";

// A single tier's octahedron node — fill + wireframe edges, exactly like the
// old makeNode(). Enhancement over the original (which just popped nodes in
// instantly via nodeLayer.add()): eases scale in from 0 on mount, and bumps
// scale/opacity slightly on hover, both via a simple per-frame lerp instead
// of a tween library — cheap, and it doesn't touch the interaction model at
// all (still the same click → toggle/detail routing either way).
export default function Node({ node, hoveredId, onHover, onUnhover, onMove, onClick }) {
  const { id, size, color, opacity, position, name, tier, isPerson } = node;
  const groupRef = useRef(null);
  const mountedAtRef = useRef(null);
  if (mountedAtRef.current === null) mountedAtRef.current = performance.now();
  const isHovered = hoveredId === id;

  const geometry = useMemo(() => new THREE.OctahedronGeometry(size, 0), [size]);

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
          <meshBasicMaterial color={color} transparent opacity={isHovered ? Math.min(1, opacity + 0.25) : opacity} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color={color} transparent opacity={0.9} />
        </lineSegments>
      </group>
      {/* Rendered as a sibling, not a child of the group above -- drei's <Html>
          doesn't play well with a parent that's actively being scaled (the
          0->1 mount-in animation), so the label reads position directly
          rather than inheriting the group's transform. */}
      <NodeLabel position={position} yOffset={size + 0.15} text={name} tier={isPerson ? 2 : tier} dim={isHovered} />
    </>
  );
}
