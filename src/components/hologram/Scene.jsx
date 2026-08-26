import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Node from "./Node";
import ConnectionLines from "./ConnectionLines";
import Particles from "./Particles";
import ScanRing from "./ScanRing";
import PostFX from "./PostFX";
import { ExternalNodes } from "./ExternalNode";
import WorkflowPulse from "./workflow/WorkflowPulse";
import WorkflowMap from "./workflow/WorkflowMap";
import ManagerLines from "./ManagerLines";

// The actual <Canvas> content: base platform, particle field, node tree and
// connection lines, camera controls and bloom. Nodes/lines are plain data
// (positions already computed by orgTree.computeVisibleNodes) rendered
// declaratively — mounting/unmounting a <Node> as the accordion state
// changes replaces the old code's manual nodeLayer.add()/.remove() calls.
//
// stakeholders/simulation/sceneState/nodesById/externalNodesById/tasksById
// are additive props for the workflow-animation feature — ExternalNodes and
// WorkflowPulse both no-op gracefully (render nothing) when simulation is
// idle/not yet ready, so passing them through doesn't change anything about
// the scene's existing behavior when no workflow is running.
export default function Scene({
  nodes, lines, hoveredId, reduceMotion, smallViewport,
  onHover, onUnhover, onMove, onClick,
  stakeholders, simulation, sceneState, nodesById, externalNodesById, tasksById,
  showFullPath, workflowSteps, workflowTransitions,
  expandedTier1, expandedTier2,
  showManagerLines,
}) {
  // Single shared clock for the scan ring pulse and the connection lines'
  // breathing glow, so both stay in the same rhythm the original's one
  // scanT variable produced — a ref (not state) since nothing here needs a
  // re-render, only per-frame imperative updates.
  const scanT = useRef(0);
  useFrame(() => {
    if (!reduceMotion) scanT.current += 0.006;
  });

  // Camera-follow-on-expand: eases OrbitControls' own orbit target toward
  // the centroid of whatever tier just got revealed, instead of only
  // recentering when the user manually drags. Deliberately only moves the
  // *target* (what the orbit is centered on), never camera.position or
  // controls.update() directly — OrbitControls already calls its own
  // .update() every frame (required for enableDamping/autoRotate to work
  // at all); mutating the target here and letting that existing internal
  // update pick it up avoids fighting drei's own per-frame handling of the
  // same controls instance. Falls back to the scene's own center when
  // nothing is expanded.
  const controlsRef = useRef(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  useEffect(() => {
    const deepestParentId = expandedTier2 || expandedTier1 || null;
    if (!deepestParentId) { cameraTargetRef.current.set(0, 0, 0); return; }
    const children = nodes.filter((n) => n.parentId === deepestParentId);
    if (!children.length) return;
    const sum = children.reduce((acc, n) => {
      acc.x += n.position[0]; acc.y += n.position[1]; acc.z += n.position[2];
      return acc;
    }, { x: 0, y: 0, z: 0 });
    cameraTargetRef.current.set(sum.x / children.length, sum.y / children.length, sum.z / children.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTier1, expandedTier2]);
  useFrame(() => {
    if (!controlsRef.current || reduceMotion) return;
    controlsRef.current.target.lerp(cameraTargetRef.current, 0.045);
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
        <Node key={n.id} node={n} hoveredId={hoveredId} onHover={onHover} onUnhover={onUnhover} onMove={onMove} onClick={onClick} reduceMotion={reduceMotion} />
      ))}
      <ConnectionLines lines={lines} hoveredId={hoveredId} reduceMotion={reduceMotion} scanT={scanT} />
      {nodesById ? <ManagerLines nodesById={nodesById} hoveredId={hoveredId} enabled={!!showManagerLines} /> : null}

      {stakeholders ? (
        <ExternalNodes stakeholders={stakeholders} hoveredId={hoveredId} onHover={onHover} onUnhover={onUnhover} onMove={onMove} onClick={onClick} reduceMotion={reduceMotion} />
      ) : null}
      {simulation && sceneState && nodesById ? (
        <WorkflowPulse
          simulation={simulation}
          sceneState={sceneState}
          nodesById={nodesById}
          externalNodesById={externalNodesById}
          tasksById={tasksById}
          reduceMotion={reduceMotion}
        />
      ) : null}
      {showFullPath && sceneState && nodesById ? (
        <WorkflowMap
          steps={workflowSteps}
          transitions={workflowTransitions}
          tasksById={tasksById}
          sceneState={sceneState}
          nodesById={nodesById}
          externalNodesById={externalNodesById}
        />
      ) : null}

      <OrbitControls
        ref={controlsRef}
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
