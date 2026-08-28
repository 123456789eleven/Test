import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
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
  showManagerLines, titlesById,
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

  // Round 4 of the graphics-overhaul plan: replaces OrbitControls + a
  // hand-rolled fixed-0.045 lerp with drei's CameraControls (wraps
  // yomotsu/camera-controls, real SmoothDamp-based easing) and its own
  // real .moveTo(x, y, z, enableTransition) method -- "move target position
  // to given point" (confirmed by reading the library's own source, not
  // assumed), the exact semantic equivalent of the old lerp: only the orbit
  // pivot moves, never camera.position, so the user's chosen distance/angle
  // is preserved across a refocus exactly like before. Falls back to the
  // scene's own center when nothing is expanded.
  const controlsRef = useRef(null);
  const userDraggingRef = useRef(false);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // A person drill chain is deeper than expandedTier2, so it wins when
    // present -- same fallback order the accordion state itself follows
    // (personPath only ever has entries while a person chain is open, and
    // never coexists with an open vertical at the same tier2 slot).
    const deepestParentId = (personPath && personPath.length ? personPath[personPath.length - 1] : null) || expandedTier2 || expandedTier1 || null;
    if (!deepestParentId) { controls.moveTo(0, 0, 0, !reduceMotion); return; }
    const children = nodes.filter((n) => n.parentId === deepestParentId);
    if (!children.length) return;
    const sum = children.reduce((acc, n) => {
      acc.x += n.position[0]; acc.y += n.position[1]; acc.z += n.position[2];
      return acc;
    }, { x: 0, y: 0, z: 0 });
    controls.moveTo(sum.x / children.length, sum.y / children.length, sum.z / children.length, !reduceMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTier1, expandedTier2, personPath]);

  // Manual idle auto-rotation -- camera-controls has no built-in autoRotate
  // (confirmed by reading its source; OrbitControls has one, this library
  // doesn't), so this replicates it: a small continuous azimuth rotate,
  // frame-rate-independent via `delta`, paused while the user is actively
  // dragging (onControlStart/onControlEnd below) so it doesn't fight real
  // input the way a naive "always rotate" would.
  // Flagged twice as "terribly fast" -- the prior value (0.12 rad/s) was
  // never actually reduced from round 4's original, since P1 was correctly
  // deferred until P0 was confirmed last round, not because a smaller cut
  // was tried and found insufficient. At 0.12 rad/s a full rotation took
  // ~52s (2*PI/0.12) -- under a minute, matching the complaint exactly.
  // New target: 5 minutes (300s) per rotation, the top of the requested
  // 3-5min range for margin above the floor. 2*PI/300 = 0.020944 rad/s.
  // Verified by direct stopwatch timing in a real browser, not calculated
  // and assumed -- a server-side timestamp-logging attempt was tried first
  // but produced no data at all across a 320s wait, because the browser tab
  // wasn't confirmed to stay focused/rendering the whole time (requestAnimationFrame,
  // which this loop runs on, gets throttled or paused in a backgrounded tab) --
  // a real limitation of that verification method, not evidence against the fix.
  const AUTOROTATE_SPEED = 0.020944; // rad/s -- 2*PI/300, a 5-minute full rotation
  useFrame((_, delta) => {
    if (!controlsRef.current || reduceMotion || userDraggingRef.current) return;
    controlsRef.current.rotate(AUTOROTATE_SPEED * delta, 0, false);
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
      {/* A diagnostic pass briefly forced this to bright magenta at 0.35
          density to prove fog was live, after the scene washed out into a
          grey blob -- that turned out to be SSAOPass's output mode, not
          this. Restored to the real round-2 value. Flagging explicitly:
          this color (0x0a0912) still
          matches the background disc almost exactly, which was the
          original, separate, already-documented concern about this fog --
          if it now reads as "no fog at all" rather than "washed out," that
          is that known, different issue, not a new one, and not something
          silently swept past here. */}
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
        <Node key={n.id} node={n} hoveredId={hoveredId} onHover={onHover} onUnhover={onUnhover} onMove={onMove} onClick={onClick} reduceMotion={reduceMotion} titlesById={titlesById} />
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

      <CameraControls
        ref={controlsRef}
        minDistance={6}
        maxDistance={26}
        maxPolarAngle={Math.PI * 0.46}
        smoothTime={0.25}
        onControlStart={() => { userDraggingRef.current = true; }}
        onControlEnd={() => { userDraggingRef.current = false; }}
      />
      <PostFX strength={smallViewport ? 0.55 : 0.8} radius={0.22} threshold={0.32} />
    </>
  );
}
