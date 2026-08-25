import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Node from "./Node";
import ConnectionLines from "./ConnectionLines";
import Particles from "./Particles";
import ScanRing from "./ScanRing";
import PostFX from "./PostFX";

// The actual <Canvas> content: base platform, particle field, node tree and
// connection lines, camera controls and bloom. Nodes/lines are plain data
// (positions already computed by orgTree.computeVisibleNodes) rendered
// declaratively — mounting/unmounting a <Node> as the accordion state
// changes replaces the old code's manual nodeLayer.add()/.remove() calls.
export default function Scene({
  nodes, lines, hoveredId, reduceMotion, smallViewport,
  onHover, onUnhover, onMove, onClick,
}) {
  // Single shared clock for the scan ring pulse and the connection lines'
  // breathing glow, so both stay in the same rhythm the original's one
  // scanT variable produced — a ref (not state) since nothing here needs a
  // re-render, only per-frame imperative updates.
  const scanT = useRef(0);
  useFrame(() => {
    if (!reduceMotion) scanT.current += 0.006;
  });

  const particleCount = smallViewport ? 90 : 220;

  return (
    <>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[8.6, 8.6, 0.25, 64]} />
        <meshBasicMaterial color={0x0b1017} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <ringGeometry args={[8.5, 8.6, 64]} />
        <meshBasicMaterial color={0x1d9e75} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>

      <Particles count={particleCount} reduceMotion={reduceMotion} />
      <ScanRing reduceMotion={reduceMotion} scanT={scanT} />

      {nodes.map((n) => (
        <Node key={n.id} node={n} hoveredId={hoveredId} onHover={onHover} onUnhover={onUnhover} onMove={onMove} onClick={onClick} />
      ))}
      <ConnectionLines lines={lines} hoveredId={hoveredId} reduceMotion={reduceMotion} scanT={scanT} />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.6}
        minDistance={6}
        maxDistance={26}
        maxPolarAngle={Math.PI * 0.49}
      />
      <PostFX strength={smallViewport ? 0.55 : 0.8} radius={0.22} threshold={0.28} />
    </>
  );
}
