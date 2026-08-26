import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Node from "./Node";
import ConnectionLines from "./ConnectionLines";
import Particles from "./Particles";
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
  expandedTier1, expandedTier2, personPath,
  showManagerLines,
}) {
  // Shared clock for the connection lines' breathing glow (also drove the
  // sonar ScanRing, removed -- its vertical sweep was the actual "pane
  // moving up and down" complaint, not the static platform rim) — a ref
  // (not state) since nothing here needs a re-render, only per-frame
  // imperative updates.
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
    // A person drill chain is deeper than expandedTier2, so it wins when
    // present -- same fallback order the accordion state itself follows
    // (personPath only ever has entries while a person chain is open, and
    // never coexists with an open vertical at the same tier2 slot).
    const deepestParentId = (personPath && personPath.length ? personPath[personPath.length - 1] : null) || expandedTier2 || expandedTier1 || null;
    if (!deepestParentId) { cameraTargetRef.current.set(0, 0, 0); return; }
    const children = nodes.filter((n) => n.parentId === deepestParentId);
    if (!children.length) return;
    const sum = children.reduce((acc, n) => {
      acc.x += n.position[0]; acc.y += n.position[1]; acc.z += n.position[2];
      return acc;
    }, { x: 0, y: 0, z: 0 });
    cameraTargetRef.current.set(sum.x / children.length, sum.y / children.length, sum.z / children.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTier1, expandedTier2, personPath]);
  useFrame(() => {
    if (!controlsRef.current || reduceMotion) return;
    controlsRef.current.target.lerp(cameraTargetRef.current, 0.045);
  });

  const particleCount = smallViewport ? 90 : 220;

  return (
    <>
      {/* Round 2 of the graphics-overhaul plan: real scene depth via native
          three.js fog, tinted to the same dark tone as the base platform
          (0x0a0912, matches --page) rather than a new color. Distant tier1
          neighbors (~6.5 units apart) previously had zero visual cue of
          being "far" -- everything read at the same flat depth regardless
          of distance. Every fog-aware material (the unlit fills, the
          connection lines, the particle field -- all default to fog:true)
          picks this up automatically, no per-object changes needed. The
          custom rim shader is raw GLSL without the standard fog chunks, so
          it's NOT fogged by this -- a deliberate, low-risk scope boundary
          for this round, not an oversight. */}
      <fogExp2 attach="fog" args={[0x0a0912, 0.045]} />

      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[8.6, 8.6, 0.25, 64]} />
        <meshBasicMaterial color={0x0a0912} />
      </mesh>
      {/* Recolored into the violet family (was an unrelated teal-green) and
          dropped to a much quieter opacity -- at low camera angles this
          thin rim was filling a large fraction of the frame and blooming
          into a dominant green pane; see maxPolarAngle below for the other
          half of that fix. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <ringGeometry args={[8.5, 8.6, 64]} />
        <meshBasicMaterial color={0x4b3d78} side={THREE.DoubleSide} transparent opacity={0.22} />
      </mesh>

      <Particles count={particleCount} reduceMotion={reduceMotion} />

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
        maxPolarAngle={Math.PI * 0.46}
      />
      <PostFX strength={smallViewport ? 0.55 : 0.8} radius={0.22} threshold={0.32} />
    </>
  );
}
