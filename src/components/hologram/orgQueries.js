import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../lib/supabaseClient";

// Canonical react-query keys for the org tables — shared between the
// Hologram scene (which reads all of them to build the tree) and the
// org-edit forms (which read a subset for dropdown options and invalidate
// them after a mutation). One place for both sides to agree on cache keys.
export const QK = {
  divisions: ["org_divisions"],
  verticals: ["org_verticals"],
  functions: ["org_functions"],
  people: ["org_people"],
  connections: ["org_connections"],
  tasks: ["tasks"],
  tools: ["tools"],
  taskTools: ["task_tools"],
  companyStatic: ["company-static"],
};

async function selectAll(table, orderBy) {
  let q = supabaseClient.from(table).select("*");
  if (orderBy) q = q.order(orderBy);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export function useOrgDivisions() {
  return useQuery({ queryKey: QK.divisions, queryFn: () => selectAll("org_divisions", "sort_order") });
}
export function useOrgVerticals() {
  return useQuery({ queryKey: QK.verticals, queryFn: () => selectAll("org_verticals", "sort_order") });
}
export function useOrgFunctions() {
  return useQuery({ queryKey: QK.functions, queryFn: () => selectAll("org_functions", "sort_order") });
}
export function useOrgPeople() {
  return useQuery({ queryKey: QK.people, queryFn: () => selectAll("org_people", "sort_order") });
}
export function useOrgConnections() {
  return useQuery({ queryKey: QK.connections, queryFn: () => selectAll("org_connections") });
}
export function useTasks() {
  return useQuery({ queryKey: QK.tasks, queryFn: () => selectAll("tasks") });
}
export function useTools() {
  return useQuery({ queryKey: QK.tools, queryFn: () => selectAll("tools") });
}
export function useTaskTools() {
  return useQuery({ queryKey: QK.taskTools, queryFn: () => selectAll("task_tools") });
}

// Last-saved static snapshot — used only as a fallback when the live org
// tables can't be reached (see assembleOrgData below). Required for the
// scene to render at all; if this fetch itself fails there's nothing to
// show, live or otherwise.
export function useCompanyStatic() {
  return useQuery({
    queryKey: QK.companyStatic,
    queryFn: () => fetch(`${import.meta.env.BASE_URL}data/company.json`).then((r) => r.json()),
    staleTime: Infinity,
  });
}

// Groups flat org_verticals + org_functions rows into the nested shape the
// scene and the static fallback file both use: { [verticalId]: { division,
// name, confirmed, desc, funcs: [...] } }.
function groupVerticals(verticalRows, functionRows) {
  const verticals = {};
  verticalRows.forEach((v) => {
    verticals[v.id] = { division: v.division, name: v.name, confirmed: v.confirmed, desc: v.desc, funcs: [] };
  });
  functionRows.forEach((f) => {
    if (verticals[f.vertical]) verticals[f.vertical].funcs.push({ id: f.id, label: f.label, confirmed: f.confirmed });
  });
  return verticals;
}

// Assembles the shape buildSceneState() expects from the five live queries,
// falling back to the static snapshot's already-shaped fields whenever any
// one of the five core org tables can't be reached — matching the original
// loadOrgData() catch: it's all-or-nothing per source, not merged field by
// field, since a partial mix of live/stale rows could misrepresent the tree.
export function assembleOrgData({ divisionsQ, verticalsQ, functionsQ, peopleQ, connectionsQ, staticQ }) {
  const coreQueries = [divisionsQ, verticalsQ, functionsQ, peopleQ, connectionsQ];
  const liveReady = coreQueries.every((q) => q.isSuccess);
  if (liveReady) {
    return {
      divisions: divisionsQ.data,
      verticals: groupVerticals(verticalsQ.data, functionsQ.data),
      leadership: peopleQ.data.map((p) => ({
        id: p.id, name: p.name, title: p.title, note: p.note, parent: p.parent, cross: p.cross_divisions,
      })),
      processConnections: connectionsQ.data.map((c) => ({ from: c.from_id, to: c.to_id, type: c.type, note: c.note })),
    };
  }
  const someLiveErrored = coreQueries.some((q) => q.isError);
  if (someLiveErrored && staticQ.data) {
    const s = staticQ.data;
    return { divisions: s.divisions, verticals: s.verticals, leadership: s.leadership, processConnections: s.processConnections };
  }
  return null; // still loading, no verdict yet
}

// Task/tool capability layer — read-only here, still function-level,
// matching how org_connections already works. A failure here just leaves
// function detail panels showing name-only; it never blocks the scene.
export function buildTasksByFunction({ tasksQ, toolsQ, taskToolsQ }) {
  if (!tasksQ.isSuccess || !toolsQ.isSuccess || !taskToolsQ.isSuccess) return {};
  const toolsById = {};
  toolsQ.data.forEach((t) => { toolsById[t.id] = t; });
  const toolsByTask = {};
  taskToolsQ.data.forEach((l) => {
    if (!toolsByTask[l.task_id]) toolsByTask[l.task_id] = [];
    const tool = toolsById[l.tool_id];
    if (tool) toolsByTask[l.task_id].push(tool);
  });
  const tasksByFunction = {};
  tasksQ.data.forEach((t) => {
    if (!tasksByFunction[t.function_id]) tasksByFunction[t.function_id] = [];
    tasksByFunction[t.function_id].push({ ...t, tools: toolsByTask[t.id] || [] });
  });
  return tasksByFunction;
}
