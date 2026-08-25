import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The slow vertical "sonar" pulse — position and opacity driven off the same
// shared scene clock the connection lines' breathing glow reads, so both
// stay in the same rhythm the original's single scanT variable produced.
export default function ScanRing({ reduceMotion, scanT }) {
  const meshRef = useRef(null);

  useFrame(() => {
    const m = meshRef.current;
    if (!m || reduceMotion) return;
    const t = scanT.current;
    m.position.y = (Math.sin(t) * 0.5 + 0.5) * 3.6;
    m.material.opacity = 0.03 + 0.045 * (1 - Math.abs(Math.sin(t)));
  });

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.3, 9.2, 72]} />
      <meshBasicMaterial color={0x5dcaa5} transparent opacity={0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
