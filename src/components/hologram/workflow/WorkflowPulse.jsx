import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";
import { resolveStepLocation, GLOW, SHARED_GLOW } from "../orgTree";

// Renders the traveling light that visualizes a real workflow_steps /
// workflow_transitions run in progress. This component owns NO state of its
// own about "which step are we on" -- that's useWorkflowSimulation's job,
// called once by a shared ancestor and handed down as `simulation` so the
// (separately built) 2D controls drive the exact same instance. What this
// file owns is purely visual: turning `simulation.currentStepId` changes
// into a pulse that travels between two resolved 3D positions, arced and
// timed the same way ConnectionLines.jsx already draws static connections
// (see buildArcCurve below -- deliberately the same curve shape, just kept
// live via .getPointAt() every frame instead of baked once).

const POP_MS = 420; // fixed "materialize" duration for the very first step, independent of dwellMs (mirrors Node.jsx's fixed 260ms mount-in -- a short UI beat, not something that should stretch with workflow pacing).
const CORE_SIZE = 0.16;
const HALO_SIZE = 0.4;
const GLOW_COLOR = new THREE.Color(GLOW);
const SHARED_GLOW_COLOR = new THREE.Color(SHARED_GLOW);

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Exactly ConnectionLines.jsx's curve construction (QuadraticBezierCurve3,
// midpoint raised 0.5 in Y) -- kept as a real THREE.Curve3 instance instead
// of being baked to static points, since the pulse needs to sample it live
// via .getPointAt(t) every frame rather than draw it once.
function buildArcCurve(fromArr, toArr) {
  const from = new THREE.Vector3(...fromArr);
  const to = new THREE.Vector3(...toArr);
  const mid = from.clone().lerp(to, 0.5);
  mid.y += 0.5;
  return new THREE.QuadraticBezierCurve3(from, mid, to);
}

// A small, self-contained "this branch leads here" marker at a resolved
// decision-branch destination -- deliberately its own tiny octahedron with
// its own gentle pulse rather than an animated line material, since the
// exact per-frame API surface of drei's fat-line material (QuadraticBezierLine
// is backed by three-stdlib's Line2/LineMaterial) isn't something to guess
// at for a nice-to-have. The line itself (rendered by the caller) stays
// static/cheap; this ghost node carries the "alive" feeling instead.
function BranchGhost({ position, reduceMotion }) {
  const meshRef = useRef(null);
  const matRef = useRef(null);
  const geometry = useMemo(() => new THREE.OctahedronGeometry(0.11, 0), []);

  useFrame(() => {
    const m = meshRef.current;
    const mat = matRef.current;
    if (!m || !mat) return;
    if (reduceMotion) {
      m.scale.setScalar(0.85);
      mat.opacity = 0.5;
      return;
    }
    const phase = performance.now() * 0.003;
    m.scale.setScalar(0.75 + 0.25 * Math.sin(phase * 2.6));
    mat.opacity = 0.32 + 0.22 * Math.sin(phase * 2.6);
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <meshBasicMaterial ref={matRef} color={SHARED_GLOW} transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}

// WorkflowPulse({ simulation, sceneState, nodesById, externalNodesById, tasksById, reduceMotion, dwellMs })
//
// - simulation: the exact return value of useWorkflowSimulation(), called
//   ONCE by a shared ancestor (Hologram.jsx) and passed down here as a prop
//   -- never call the hook from this component, or the 2D controls end up
//   driving a disconnected copy of the state machine.
// - sceneState / nodesById / externalNodesById / tasksById: passed straight
//   through to orgTree.resolveStepLocation exactly as that function expects
//   them (nodesById and externalNodesById are Maps keyed by node id /
//   stakeholder id -- see computeVisibleNodes/buildExternalNodes in
//   orgTree.js; tasksById is a plain object keyed by task id).
// - dwellMs: optional, defaults to 1800 to match useWorkflowSimulation's own
//   default. Pass the same value here if the hook is ever configured with a
//   non-default dwellMs, so the pulse's travel timing stays in sync with the
//   real auto-advance timer.
// - reduceMotion: optional, defaults to false. When true, the pulse still
//   reflects state changes but skips tweened travel/pulsing -- positions
//   snap directly, matching how ConnectionLines/Scene already treat this
//   flag (hold steady, don't animate continuously).
export default function WorkflowPulse({
  simulation,
  sceneState,
  nodesById,
  externalNodesById,
  tasksById,
  reduceMotion = false,
  dwellMs = 1800,
}) {
  const groupRef = useRef(null);
  const coreMatRef = useRef(null);
  const haloMatRef = useRef(null);

  const coreGeometry = useMemo(() => new THREE.OctahedronGeometry(CORE_SIZE, 0), []);
  const haloGeometry = useMemo(() => new THREE.OctahedronGeometry(HALO_SIZE, 0), []);

  // hopRef describes "what the pulse is currently doing" -- set imperatively
  // by the effect below whenever currentStepId changes, read every frame by
  // useFrame. lastResolvedPosRef is the one bit of "history" the simulation
  // hook deliberately doesn't track (see useWorkflowSimulation.js's header
  // comment): the last real 3D position the pulse actually stood at, used
  // as the "from" of whatever hop comes next, and as the anchor a run of
  // unresolved steps skips past rather than inventing a position for.
  const hopRef = useRef(null);
  const lastResolvedPosRef = useRef(null); // THREE.Vector3 | null
  const opacityRef = useRef(0);
  const colorRef = useRef(null);
  if (!colorRef.current) colorRef.current = new THREE.Color(GLOW);

  // Starts a new hop whenever the state machine lands on a new step. Only
  // currentStepId is a dependency here on purpose: sceneState/nodesById/
  // tasksById/externalNodesById can change reference on unrelated re-renders
  // (hover state, accordion drilling elsewhere in the scene) without a real
  // step change happening, and re-running this on every such render would
  // restart the travel animation from scratch for no reason. Whatever those
  // props' values are at the moment currentStepId actually changes is the
  // correct snapshot to resolve against.
  useEffect(() => {
    const stepId = simulation.currentStepId;
    if (!stepId || !simulation.currentStep || !sceneState || !nodesById) {
      hopRef.current = null;
      return;
    }

    const resolved = resolveStepLocation(simulation.currentStep, {
      tasksById, sceneState, nodesById, externalNodesById,
    });

    if (resolved.kind === "unresolved") {
      // A real, honest "this step doesn't map to a location" -- never
      // fabricate one. Keep lastResolvedPosRef untouched so the *next*
      // resolvable step travels from wherever the pulse last really was,
      // effectively skipping this invisible waypoint instead of jumping to
      // a guessed spot.
      hopRef.current = { stepId, unresolved: true };
      return;
    }

    const toVec = new THREE.Vector3(...resolved.position);
    const fromVec = lastResolvedPosRef.current; // null => this is the first resolvable step ever seen
    // Travel finishes comfortably inside the dwell window so the pulse is
    // resting (or, for a decision, already pulsing) by the time the state
    // machine would otherwise auto-advance -- never right at the edge.
    const travelMs = Math.max(400, Math.min(dwellMs - 200, dwellMs * 0.65));

    hopRef.current = {
      stepId,
      unresolved: false,
      isFirst: !fromVec,
      to: toVec,
      curve: fromVec ? buildArcCurve([fromVec.x, fromVec.y, fromVec.z], resolved.position) : null,
      startTime: performance.now(),
      travelMs,
      arrivedAt: null,
    };
    lastResolvedPosRef.current = toVec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.currentStepId]);

  // A fresh play() after reset() should pop in again rather than travel from
  // wherever the previous run ended.
  useEffect(() => {
    if (simulation.status === "idle") {
      hopRef.current = null;
      lastResolvedPosRef.current = null;
      opacityRef.current = 0;
    }
  }, [simulation.status]);

  // Zero the group's scale once on mount only (not as a reactive JSX prop --
  // see useFrame below, which owns position/scale imperatively every frame;
  // a reactive position/scale prop here would fight it and snap back to
  // (0,0,0)/0-scale on every unrelated re-render).
  useEffect(() => {
    if (groupRef.current) groupRef.current.scale.setScalar(0);
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    const coreMat = coreMatRef.current;
    const haloMat = haloMatRef.current;
    if (!group || !coreMat || !haloMat) return;

    const hop = hopRef.current;
    const now = performance.now();
    let targetOpacity = 0;
    let scaleMul = 1;

    if (!hop) {
      targetOpacity = 0;
    } else if (hop.unresolved) {
      // Pause invisibly (a faint trace, not a hard cut) at wherever the
      // pulse last really was -- no position write, nothing to travel toward.
      targetOpacity = lastResolvedPosRef.current ? 0.05 : 0;
    } else if (hop.isFirst) {
      // No previous step to travel from: fade/pop in at the first
      // resolvable location instead of animating from nowhere.
      targetOpacity = 1;
      const elapsed = now - hop.startTime;
      const t = reduceMotion ? 1 : Math.min(1, elapsed / POP_MS);
      scaleMul = easeOutCubic(t);
      group.position.copy(hop.to);
    } else {
      targetOpacity = 1;
      const elapsed = now - hop.startTime;
      const t = reduceMotion ? 1 : Math.min(1, elapsed / hop.travelMs);
      if (t >= 1) {
        group.position.copy(hop.to);
        if (hop.arrivedAt == null) hop.arrivedAt = now;
      } else {
        group.position.copy(hop.curve.getPointAt(easeInOutCubic(t)));
      }
    }

    // Decision points get a distinct held, pulsing glow instead of just
    // stopping -- reads as "the story is branching here", not "the
    // animation froze". Kicks in once the pulse has actually arrived (or
    // immediately, if the very first step of the run is itself a decision).
    const holding = simulation.status === "at-decision" && hop && !hop.unresolved
      && (hop.isFirst || hop.arrivedAt != null);

    colorRef.current.lerp(holding ? SHARED_GLOW_COLOR : GLOW_COLOR, reduceMotion ? 1 : 0.08);
    coreMat.color.copy(colorRef.current);
    haloMat.color.copy(colorRef.current);

    if (!reduceMotion) {
      if (holding) {
        const phase = now * 0.0035 * 3.1;
        scaleMul *= 1 + 0.22 * Math.sin(phase);
      } else if (hop && !hop.unresolved && hop.arrivedAt != null) {
        // Small decaying "landed" pop on arrival at a non-decision step.
        const since = now - hop.arrivedAt;
        if (since < 260) scaleMul *= 1 + 0.4 * Math.exp(-since / 90);
      }
    }

    opacityRef.current += (targetOpacity - opacityRef.current) * (reduceMotion ? 1 : 0.18);
    const op = opacityRef.current;
    coreMat.opacity = op;
    haloMat.opacity = op * (holding ? 0.55 : 0.4);
    group.visible = op > 0.01;
    group.scale.setScalar(Math.max(0.0001, scaleMul));
  });

  // Decision-branch fan-out hint: resolved purely from render-time data
  // (simulation.currentStep / availableBranches / graph), never from the
  // imperative refs above, so it can't go stale between the step landing
  // and this component's own effect running.
  const decisionVisuals = useMemo(() => {
    if (simulation.status !== "at-decision" || !simulation.currentStep || !sceneState || !nodesById) return null;
    const originResolved = resolveStepLocation(simulation.currentStep, {
      tasksById, sceneState, nodesById, externalNodesById,
    });
    if (originResolved.kind === "unresolved") return null;

    const branches = (simulation.availableBranches || []).map((branch) => {
      const destStep = simulation.graph?.stepsById?.get(branch.to_step_id);
      if (!destStep) return null;
      const destResolved = resolveStepLocation(destStep, { tasksById, sceneState, nodesById, externalNodesById });
      if (destResolved.kind === "unresolved") return null;
      return { id: branch.id, position: destResolved.position };
    }).filter(Boolean);

    return { origin: originResolved.position, branches };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.status, simulation.currentStep, simulation.availableBranches, simulation.graph, sceneState, nodesById, externalNodesById, tasksById]);

  if (simulation.status !== "playing" && simulation.status !== "at-decision") return null;

  return (
    <>
      <Trail
        target={groupRef}
        width={reduceMotion ? 0.02 : 1.1}
        length={reduceMotion ? 0.4 : 4}
        decay={1}
        local={false}
        color={GLOW}
      >
        <group ref={groupRef}>
          <mesh geometry={haloGeometry}>
            <meshBasicMaterial ref={haloMatRef} color={GLOW} transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh geometry={coreGeometry}>
            <meshBasicMaterial ref={coreMatRef} color={GLOW} transparent opacity={0} />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[coreGeometry]} />
            <lineBasicMaterial color={GLOW} transparent opacity={0.9} />
          </lineSegments>
        </group>
      </Trail>

      {decisionVisuals && decisionVisuals.branches.map((branch) => {
        const mid = [
          (decisionVisuals.origin[0] + branch.position[0]) / 2,
          Math.max(decisionVisuals.origin[1], branch.position[1]) + 0.5,
          (decisionVisuals.origin[2] + branch.position[2]) / 2,
        ];
        return (
          <group key={branch.id}>
            <QuadraticBezierLine
              start={decisionVisuals.origin}
              end={branch.position}
              mid={mid}
              color={SHARED_GLOW}
              lineWidth={1}
              transparent
              opacity={0.3}
              dashed
              dashSize={0.14}
              gapSize={0.1}
            />
            <BranchGhost position={branch.position} reduceMotion={reduceMotion} />
          </group>
        );
      })}
    </>
  );
}
