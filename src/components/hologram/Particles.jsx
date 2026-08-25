import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Ambient drifting particle field — purely decorative, matches the original
// 1:1: same radius/height distribution, same upward drift speed and wrap.
export default function Particles({ count, reduceMotion }) {
  const geomRef = useRef(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 7.5, theta = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = Math.random() * 4.5;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useFrame(() => {
    if (reduceMotion) return;
    const geom = geomRef.current;
    if (!geom) return;
    const pos = geom.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += 0.004;
      if (pos[i * 3 + 1] > 4.5) pos[i * 3 + 1] = 0;
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={0x5dcaa5} size={0.03} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}
