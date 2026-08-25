import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useAuth } from "../hooks/useAuth";
import { useSearchRegister } from "../hooks/useSearchRegister";
import Scene from "../components/hologram/Scene";
import HoverLabel from "../components/hologram/HoverLabel";
import DetailPanel from "../components/hologram/DetailPanel";
import { buildSceneState, computeVisibleNodes, buildExternalNodes, locateStepOwner } from "../components/hologram/orgTree";
import {
  useOrgDivisions, useOrgVerticals, useOrgFunctions, useOrgPeople, useOrgConnections,
  useTasks, useTools, useTaskTools, useCompanyStatic, assembleOrgData, buildTasksByFunction,
  useExternalStakeholders, useWorkflows, useWorkflowSteps, useWorkflowTransitions,
} from "../components/hologram/orgQueries";
import { useWorkflowSimulation } from "../components/hologram/workflow/useWorkflowSimulation";
import WorkflowControls from "../components/hologram/workflow/WorkflowControls";
import WorkflowStepInfo from "../components/hologram/workflow/WorkflowStepInfo";
import DivisionForm from "../components/orgedit/DivisionForm";
import VerticalForm from "../components/orgedit/VerticalForm";
import FunctionForm from "../components/orgedit/FunctionForm";
import PersonForm from "../components/orgedit/PersonForm";
import ConnectionsManager from "../components/orgedit/ConnectionsManager";

const EMPTY_VISIBLE = { nodesById: new Map(), allNodes: [], lines: [] };
const EMPTY_EXTERNAL_IDS = new Map();

export default function Hologram() {
  const { isSignedIn } = useAuth();

  const staticQ = useCompanyStatic();
  const divisionsQ = useOrgDivisions();
  const verticalsQ = useOrgVerticals();
  const functionsQ = useOrgFunctions();
  const peopleQ = useOrgPeople();
  const connectionsQ = useOrgConnections();
  const tasksQ = useTasks();
  const toolsQ = useTools();
  const taskToolsQ = useTaskTools();
  const stakeholdersQ = useExternalStakeholders();
  const workflowsQ = useWorkflows();
  const workflowStepsQ = useWorkflowSteps();
  const workflowTransitionsQ = useWorkflowTransitions();

  // All-or-nothing per source, same as the old loadOrgData() catch: falls
  // back to the last-saved static snapshot only once a live org query has
  // actually errored, never a live/stale field-by-field mix.
  const orgData = useMemo(
    () => assembleOrgData({ divisionsQ, verticalsQ, functionsQ, peopleQ, connectionsQ, staticQ }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      divisionsQ.data, verticalsQ.data, functionsQ.data, peopleQ.data, connectionsQ.data,
      divisionsQ.isError, verticalsQ.isError, functionsQ.isError, peopleQ.isError, connectionsQ.isError,
      staticQ.data,
    ]
  );

  const tasksByFunction = useMemo(
    () => buildTasksByFunction({ tasksQ, toolsQ, taskToolsQ }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasksQ.data, toolsQ.data, taskToolsQ.data, tasksQ.isSuccess, toolsQ.isSuccess, taskToolsQ.isSuccess]
  );

  const sceneState = useMemo(() => (orgData ? buildSceneState(orgData) : null), [orgData]);

  // Keyed by task id (not function id like tasksByFunction above) — what
  // orgTree.resolveStepLocation needs to walk workflow_steps.task_id ->
  // tasks.function_id for the workflow-animation feature.
  const tasksById = useMemo(() => {
    const map = {};
    (tasksQ.data || []).forEach((t) => { map[t.id] = t; });
    return map;
  }, [tasksQ.data]);

  const externalNodesById = useMemo(() => {
    if (!stakeholdersQ.data) return EMPTY_EXTERNAL_IDS;
    return new Map(buildExternalNodes(stakeholdersQ.data).map((n) => [n.id, n]));
  }, [stakeholdersQ.data]);

  // Called exactly once here so the pulse (inside <Canvas>, via Scene) and
  // the 2D controls/step-info below both drive/read the same state instance
  // — see useWorkflowSimulation.js's own header comment for why neither of
  // those components calls this hook itself.
  const simulation = useWorkflowSimulation(workflowStepsQ.data, workflowTransitionsQ.data);

  useSearchRegister(
    "Hologram",
    useMemo(() => (orgData?.divisions || []).map((d) => ({ title: `Structure: ${d.name}`, snippet: d.desc, route: "hologram" })), [orgData])
  );

  // Accordion: one open branch per level. Reflected declaratively — no
  // manual add/remove of Three objects, computeVisibleNodes just recomputes
  // the whole visible set from these two ids on every change.
  const [expandedTier1, setExpandedTier1] = useState(null);
  const [expandedTier2, setExpandedTier2] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [detailFunction, setDetailFunction] = useState(null);
  const [editRequest, setEditRequest] = useState(null); // { kind, mode, id, parentId }
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);

  // Drives the accordion from whatever step is currently playing, so the
  // scene actually opens up and follows the pulse around instead of most
  // steps silently collapsing onto whichever one or two divisions happen to
  // already be expanded. Same accordion rule as a manual click (one open
  // branch per level) — this just triggers it from the workflow instead of
  // a pointer event. External/unresolved steps have no owning division to
  // open, so they leave the accordion exactly as it was.
  useEffect(() => {
    if (!sceneState || !simulation.currentStep) return;
    if (simulation.status !== "playing" && simulation.status !== "at-decision") return;
    const owner = locateStepOwner(simulation.currentStep, { tasksById, sceneState });
    if (!owner) return;
    setExpandedTier1(owner.divisionId);
    setExpandedTier2(owner.verticalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.currentStepId, simulation.status, sceneState]);

  const visible = useMemo(
    () => (sceneState ? computeVisibleNodes(sceneState, expandedTier1, expandedTier2) : EMPTY_VISIBLE),
    [sceneState, expandedTier1, expandedTier2]
  );

  const reduceMotion = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, []);
  const smallViewport = useMemo(() => window.matchMedia?.("(max-width: 640px)").matches ?? false, []);

  function handleHover(node, e) {
    setHovered({ ...node, clientX: e.clientX, clientY: e.clientY });
  }
  function handleMove(node, e) {
    setHovered((prev) => (prev && prev.id === node.id ? { ...prev, clientX: e.clientX, clientY: e.clientY } : prev));
  }
  function handleUnhover(node) {
    setHovered((prev) => (prev && prev.id === node.id ? null : prev));
  }
  // A node with zero children is a no-op click, same as the original
  // expand()'s early return before it ever flips expandedTier1/expandedTier2
  // — e.g. a division with no departments yet, or a freshly-added department
  // with no functions yet, shouldn't ever register as "expanded".
  function hasChildren(node) {
    if (node.tier === 1) {
      return node.kind === "corpfn"
        ? sceneState.corpfnPeople.length > 0
        : Object.values(sceneState.verticals).some((v) => v.division === node.id);
    }
    if (node.tier === 2) {
      const v = sceneState.verticals[node.id];
      return !!(v && v.funcs.length > 0);
    }
    return false;
  }

  function handleClick(node) {
    if (node.tier === 3) {
      setDetailFunction((prev) => (prev && prev.id === node.id ? null : { id: node.id, name: node.name }));
      return;
    }
    if (!node.expandable) return;
    if (node.tier === 1) {
      const isOpen = expandedTier1 === node.id;
      if (!isOpen && !hasChildren(node)) return;
      setExpandedTier1(isOpen ? null : node.id);
      setExpandedTier2(null);
    } else if (node.tier === 2) {
      const isOpen = expandedTier2 === node.id;
      if (!isOpen && !hasChildren(node)) return;
      setExpandedTier2(isOpen ? null : node.id);
    }
  }

  function openEdit(kind, id, parentId) { setEditRequest({ kind, mode: "edit", id, parentId }); }
  function openAdd(kind, parentId) { setEditRequest({ kind, mode: "add", id: null, parentId }); }
  function closeEdit() { setEditRequest(null); }

  const showTotalFallback = staticQ.isError;
  const sceneReady = !!orgData;

  return (
    <div className="holo-page">
      <div className="holo-header">
        <h1>Kelly Benefits — Live Structure</h1>
        <a href="#/company">Company details, leadership &amp; history →</a>
      </div>
      <div className="holo-legend">
        <span className="holo-legend-item"><span className="holo-swatch" style={{ background: "#46d6ff" }} /> Handoff connection</span>
        <span className="holo-legend-item"><span className="holo-swatch" style={{ background: "#ffb84f" }} /> Shared connection</span>
        <span className="holo-legend-item"><span className="holo-swatch" style={{ background: "#3a4250" }} /> No connections modeled yet</span>
        {isSignedIn ? (
          <button className="orgmap-fs-btn" style={{ marginLeft: "auto" }} type="button" onClick={() => setConnectionsOpen(true)}>
            🔗 Manage connections
          </button>
        ) : null}
      </div>

      <div id="holoCanvasWrap">
        {showTotalFallback ? (
          <div id="holoFallback" className="holo-fallback">
            Couldn't load Kelly Benefits data ({String(staticQ.error?.message || staticQ.error)}).
          </div>
        ) : !sceneReady ? (
          <div className="loading">Loading the live structure…</div>
        ) : (
          <>
            <Canvas
              className="holo-canvas"
              camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 15] }}
              gl={{ antialias: true, alpha: true }}
              fallback={<div id="holoFallback" className="holo-fallback">This browser/device couldn't start the 3D scene.</div>}
            >
              <Scene
                nodes={visible.allNodes}
                lines={visible.lines}
                hoveredId={hovered?.id ?? null}
                reduceMotion={reduceMotion}
                smallViewport={smallViewport}
                onHover={handleHover}
                onUnhover={handleUnhover}
                onMove={handleMove}
                onClick={handleClick}
                stakeholders={stakeholdersQ.data}
                simulation={simulation}
                sceneState={sceneState}
                nodesById={visible.nodesById}
                externalNodesById={externalNodesById}
                tasksById={tasksById}
                showFullPath={showFullPath}
                workflowSteps={workflowStepsQ.data}
                workflowTransitions={workflowTransitionsQ.data}
              />
            </Canvas>
            <HoverLabel hovered={hovered} isSignedIn={isSignedIn} onEdit={openEdit} onAdd={openAdd} />
            <div className="holo-workflow-overlay">
              <WorkflowStepInfo simulation={simulation} />
              <WorkflowControls
                simulation={simulation}
                workflows={workflowsQ.data}
                showFullPath={showFullPath}
                onToggleFullPath={() => setShowFullPath((v) => !v)}
              />
            </div>
          </>
        )}
      </div>

      <p className="holo-hint">
        Client outcome is deliberately not shown in the scene — no real client-quality data exists in this system yet to trace toward.
        Click a job function (the smallest nodes) to see its real tasks and tools, where any are recorded yet.
      </p>

      {detailFunction ? (
        <DetailPanel
          name={detailFunction.name}
          tasks={tasksByFunction[detailFunction.id] || []}
          onClose={() => setDetailFunction(null)}
        />
      ) : null}

      {editRequest?.kind === "division" ? <DivisionForm id={editRequest.id} onClose={closeEdit} /> : null}
      {editRequest?.kind === "vertical" ? (
        <VerticalForm mode={editRequest.mode} id={editRequest.id} divisionId={editRequest.parentId} onClose={closeEdit} />
      ) : null}
      {editRequest?.kind === "function" ? (
        <FunctionForm mode={editRequest.mode} id={editRequest.id} verticalId={editRequest.parentId} onClose={closeEdit} />
      ) : null}
      {editRequest?.kind === "person" ? (
        <PersonForm mode={editRequest.mode} id={editRequest.id} defaultParent={editRequest.parentId} onClose={closeEdit} />
      ) : null}
      {connectionsOpen ? <ConnectionsManager onClose={() => setConnectionsOpen(false)} /> : null}
    </div>
  );
}
