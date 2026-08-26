// Pure, React/Three-agnostic logic for the Hologram scene's hierarchy: which
// nodes exist at each tier, where they sit, and how connections resolve to
// whichever tier is currently on screen. Kept free of any rendering concerns
// so the accordion/progressive-disclosure math can be read (and checked)
// on its own, the same way the original buildScene()'s bookkeeping could be
// read independent of its Three.js calls.

export const EXEC_IDS = ["fx3", "frankIII"];
export const DIVISION_ORDER = ["strategies", "advantage", "payroll", "advisory"];
export const RADIUS = { division: 0.75, vertical: 0.34, function: 0.19 };
export const GLOW = 0x46d6ff;
export const SHARED_GLOW = 0xffb84f;
export const QUIET = 0x3a4250;
export const PEOPLE_GLOW = 0x8b93c9;

// tier1 -> tier2 (division/corpfn -> vertical/person) and tier2 -> tier3
// (vertical -> function) each get their own fixed angular wedge and outward/
// downward step, matching the original's two expansion "styles".
const TIER1_WEDGE = 0.95, TIER1_OUTWARD = 1.9, TIER1_YSTEP = -0.65;
const TIER2_WEDGE = 0.5, TIER2_OUTWARD = 1.6, TIER2_YSTEP = -0.55;

// Fixed total wedge divided by however many children exist, not a fixed step
// per child — so 2 siblings and 7 siblings both fit their allotted angular
// space instead of the spread growing unbounded with count.
export function distributeAngles(centerAngle, count, totalWedge) {
  if (count <= 1) return [centerAngle];
  const step = totalWedge / (count - 1);
  const out = [];
  for (let i = 0; i < count; i++) out.push(centerAngle - totalWedge / 2 + i * step);
  return out;
}

// Beyond this many children, the fixed wedge-fan above (never designed for
// more than a handful of siblings) would visibly overlap them — Corporate
// Functions currently has 130 real people, squeezed into the same ~1 radian
// wedge every other tier1->tier2 expansion uses for a handful of
// departments. spiralPositions() below is the alternative for exactly that
// case; every other expansion in the scene is untouched.
const SPIRAL_THRESHOLD = 14;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.39996 rad (~137.5deg) -- the standard phyllotaxis/"sunflower" stepping angle that spaces an arbitrary number of points with no two ever radiating along the same line
const SPIRAL_STEP = 0.24; // radius-per-sqrt(index) growth -- tuned for real, non-overlapping spacing at ~130 points; revisit if a much larger roster changes this

// A phyllotaxis spiral centered on the PARENT's own world position (not the
// scene origin) — capped by how far it grows outward, not by an angular
// wedge, so it fans out from wherever corpfn sits without reaching into a
// neighboring division's space (tier1 neighbors sit ~6.5 units apart; this
// spiral's radius at 130 points stays well inside that). Returns
// {angle, radius} pairs (not raw x/z) so the existing place()'s x=cos*r,
// z=sin*r math still applies unchanged — this only changes *how* those two
// numbers are derived for this one case, not what happens with them after.
function spiralPositions(count, parent) {
  const px = Math.cos(parent.angle) * parent.radius;
  const pz = Math.sin(parent.angle) * parent.radius;
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = SPIRAL_STEP * Math.sqrt(i + 1);
    const theta = i * GOLDEN_ANGLE;
    const x = px + Math.cos(theta) * r;
    const z = pz + Math.sin(theta) * r;
    out.push({ angle: Math.atan2(z, x), radius: Math.hypot(x, z), yOffset: -r * 0.06 });
  }
  return out;
}

export function findVerticalOf(functionId, verticals) {
  for (const [vid, v] of Object.entries(verticals)) {
    if (v.funcs.some((f) => f.id === functionId)) return vid;
  }
  return null;
}

// A connection/workflow endpoint always resolves to whichever tier is
// currently on screen — the function itself if its department is drilled
// all the way in, else its department node, else its division (divisions
// are always visible, so this never fails to resolve a real function id).
// Extracted as a standalone export (was a closure inside computeVisibleNodes
// only) so the workflow-animation feature can reuse the exact same
// resolution rule rather than re-deriving it.
export function resolveVisible(functionId, sceneState, nodesById) {
  if (nodesById.has(functionId)) return functionId;
  const vertId = findVerticalOf(functionId, sceneState.verticals);
  if (vertId && nodesById.has(vertId)) return vertId;
  const divId = vertId ? sceneState.verticals[vertId]?.division : null;
  if (divId && nodesById.has(divId)) return divId;
  return null;
}

export const EXTERNAL_STAKEHOLDER_IDS = ["stake-client", "stake-beneficiary", "stake-carrier", "stake-broker"];
const EXTERNAL_RADIUS = 9.6, EXTERNAL_Y = 0.4;

// External stakeholders (client, qualified beneficiary, carrier, broker) sit
// on a fixed ring just outside the base disc (radius 8.6, see Scene.jsx) --
// always visible, never part of the org accordion, since they represent the
// world outside Kelly Benefits, not another department to drill into. Kept
// deliberately separate from computeVisibleNodes()'s tier1/2/3 output rather
// than folded in, so the carefully-debugged accordion logic above stays
// untouched by this addition. Angle offset by half a step from tier1's own
// angles so the two rings don't visually line up radially.
export function buildExternalNodes(stakeholders) {
  const ordered = EXTERNAL_STAKEHOLDER_IDS.map((id) => (stakeholders || []).find((s) => s.id === id)).filter(Boolean);
  if (!ordered.length) return [];
  return ordered.map((s, i) => {
    const angle = (i / ordered.length) * Math.PI * 2 + Math.PI / ordered.length;
    const x = Math.cos(angle) * EXTERNAL_RADIUS, z = Math.sin(angle) * EXTERNAL_RADIUS;
    return { id: s.id, name: s.name, type: s.type, kind: "external", position: [x, EXTERNAL_Y, z] };
  });
}

// Resolves a real workflow_steps row to wherever it should animate toward:
// task_id -> tasks.function_id (existing, preferred, most specific) ->
// function_id (direct) -> stakeholder_id (external) -> unresolved. Never
// fabricates a location a step doesn't actually have -- callers must handle
// `kind: "unresolved"` explicitly (e.g. skip the hop, or hold position)
// rather than this function guessing on their behalf.
export function resolveStepLocation(step, { tasksById, sceneState, nodesById, externalNodesById }) {
  const taskFunctionId = step.task_id ? (tasksById[step.task_id] || {}).function_id : null;
  const functionId = taskFunctionId || step.function_id;
  if (functionId) {
    const resolvedId = resolveVisible(functionId, sceneState, nodesById);
    if (resolvedId) {
      const node = nodesById.get(resolvedId);
      return { kind: "internal", nodeId: resolvedId, position: node.position };
    }
  }
  if (step.stakeholder_id && externalNodesById && externalNodesById.has(step.stakeholder_id)) {
    const node = externalNodesById.get(step.stakeholder_id);
    return { kind: "external", nodeId: step.stakeholder_id, position: node.position };
  }
  return { kind: "unresolved", nodeId: null, position: null };
}

// Real manager->report lines between currently-visible person nodes, for the
// manager-hierarchy visualization. Unlike resolveVisible()/resolveStepLocation,
// there's no coarser tier to fall back to here -- a person node's manager is
// either also a currently-rendered person node (both visible, corpfn
// expanded) or it isn't (the manager is division-anchored and never gets an
// individual node at all, per this project's standing "division-specific
// leadership doesn't get 3D nodes" rule, or corpfn simply isn't expanded
// right now) -- in which case there's honestly no line to draw for that
// person, not a fallback position to invent one at. Also skips the 22 of
// 464 real people with no manager_id recorded at all (never fabricated).
export function resolveManagerLines(nodesById) {
  const lines = [];
  nodesById.forEach((node) => {
    if (!node.isPerson || !node.managerId) return;
    const managerNode = nodesById.get(node.managerId);
    if (!managerNode) return;
    lines.push({ key: `mgr:${managerNode.id}|${node.id}`, managerId: managerNode.id, reportId: node.id, from: managerNode.position, to: node.position });
  });
  return lines;
}

// The reverse of resolveVisible(): given a step, finds which division/
// vertical it actually belongs to, regardless of what's currently expanded —
// so the workflow-simulation feature can *drive* the accordion (open
// whatever tier a step lives in) rather than only reading whatever tier
// happens to already be open. Every real org_function belongs to exactly
// one vertical, and every vertical to exactly one of the 4 real divisions
// (Corporate Functions has no functions of its own, only people), so this
// always resolves cleanly for any function-linked step. Returns null for
// external/unresolved steps — there's no division/vertical to open for those.
export function locateStepOwner(step, { tasksById, sceneState }) {
  const taskFunctionId = step.task_id ? (tasksById[step.task_id] || {}).function_id : null;
  const functionId = taskFunctionId || step.function_id;
  if (!functionId) return null;
  const verticalId = findVerticalOf(functionId, sceneState.verticals);
  if (!verticalId) return null;
  const divisionId = sceneState.verticals[verticalId]?.division || null;
  if (!divisionId) return null;
  return { divisionId, verticalId };
}

// Mirrors the old buildState(): derives the fixed tier-1 list plus which
// divisions/verticals/functions currently have any modeled connection at all
// (used only to pick a node's "quiet" vs "glowing" color — connectivity
// itself never changes what's expandable or visible).
export function buildSceneState(data) {
  const verticals = data.verticals || {};
  const divisions = DIVISION_ORDER.map((id) => (data.divisions || []).find((d) => d.id === id)).filter(Boolean);
  const corpfnPeople = (data.leadership || []).filter((l) => l.parent === "root" && !EXEC_IDS.includes(l.id));
  const tier1 = [
    ...divisions.map((d) => ({ id: d.id, name: d.name, isCorpfn: false })),
    { id: "corpfn", name: "Corporate Functions", isCorpfn: true },
  ];

  const funcConnected = new Set();
  (data.processConnections || []).forEach((c) => { funcConnected.add(c.from); funcConnected.add(c.to); });
  const vertConnected = new Set(
    Object.entries(verticals).filter(([, v]) => v.funcs.some((f) => funcConnected.has(f.id))).map(([id]) => id)
  );
  const divConnected = new Set(
    divisions.filter((d) => Object.entries(verticals).some(([id, v]) => v.division === d.id && vertConnected.has(id))).map((d) => d.id)
  );

  return { verticals, divisions, corpfnPeople, tier1, funcConnected, vertConnected, divConnected, processConnections: data.processConnections || [] };
}

function colorAndConnected(sceneState, tier, item, isPerson) {
  let connected;
  if (tier === 1) connected = item.isCorpfn ? sceneState.corpfnPeople.length > 0 : sceneState.divConnected.has(item.id);
  else if (tier === 2) connected = isPerson ? true : sceneState.vertConnected.has(item.id);
  else connected = sceneState.funcConnected.has(item.id);
  const color = isPerson ? PEOPLE_GLOW : connected ? GLOW : QUIET;
  return { connected, color };
}

// Full recompute of every currently-visible node (tier1 always, tier2 only
// under expandedTier1, tier3 only under expandedTier2) plus the connection
// lines between them, resolved to whichever tier is on screen for each
// endpoint. Cheap at this data size and correct by construction on every
// expand/collapse — same tradeoff the original's rebuildLines() made.
export function computeVisibleNodes(sceneState, expandedTier1, expandedTier2) {
  const nodesById = new Map();
  const allNodes = [];

  function place(item, tier, angle, radius, y, parentId) {
    const isPerson = !!item.isPerson;
    const size = tier === 1 ? RADIUS.division : tier === 2 ? RADIUS.vertical : RADIUS.function;
    const { color } = colorAndConnected(sceneState, tier, item, isPerson);
    const opacity = tier === 1 ? 0.3 : tier === 2 ? 0.34 : 0.38;
    const kind = tier === 1 ? (item.isCorpfn ? "corpfn" : "division") : tier === 2 ? (isPerson ? "person" : "vertical") : "function";
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const expandable = tier < 3 && !isPerson;
    const expanded = tier === 1 ? item.id === expandedTier1 : tier === 2 ? item.id === expandedTier2 : false;
    const node = {
      id: item.id, name: item.name, tier, kind, isPerson, parentId,
      angle, radius, y, position: [x, y, z], size, color, opacity, expandable, expanded,
      managerId: isPerson ? item.managerId || null : null,
    };
    nodesById.set(item.id, node);
    allNodes.push(node);
    return node;
  }

  sceneState.tier1.forEach((t1, i) => {
    const angle = (i / sceneState.tier1.length) * Math.PI * 2;
    place(t1, 1, angle, 5.5, 1.6, null);
  });

  if (expandedTier1) {
    const parent = nodesById.get(expandedTier1);
    if (parent) {
      const children = parent.kind === "corpfn"
        ? sceneState.corpfnPeople.map((p) => ({ id: p.id, name: p.name, isPerson: true, managerId: p.managerId }))
        : Object.entries(sceneState.verticals).filter(([, v]) => v.division === parent.id).map(([id, v]) => ({ id, name: v.name }));
      if (children.length > SPIRAL_THRESHOLD) {
        const spiral = spiralPositions(children.length, parent);
        children.forEach((child, i) => place(child, 2, spiral[i].angle, spiral[i].radius, parent.y + TIER1_YSTEP + spiral[i].yOffset, parent.id));
      } else {
        const angles = distributeAngles(parent.angle, children.length, TIER1_WEDGE);
        children.forEach((child, i) => place(child, 2, angles[i], parent.radius + TIER1_OUTWARD, parent.y + TIER1_YSTEP, parent.id));
      }
    }
  }

  if (expandedTier2) {
    const parent = nodesById.get(expandedTier2);
    if (parent && parent.tier === 2 && !parent.isPerson) {
      const v = sceneState.verticals[parent.id];
      const children = v ? v.funcs.map((f) => ({ id: f.id, name: f.label })) : [];
      const angles = distributeAngles(parent.angle, children.length, TIER2_WEDGE);
      children.forEach((child, i) => place(child, 3, angles[i], parent.radius + TIER2_OUTWARD, parent.y + TIER2_YSTEP, parent.id));
    }
  }

  const seen = new Set();
  const lines = [];
  sceneState.processConnections.forEach((c) => {
    const a = resolveVisible(c.from, sceneState, nodesById), b = resolveVisible(c.to, sceneState, nodesById);
    if (!a || !b || a === b) return;
    const key = [a, b].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    const na = nodesById.get(a), nb = nodesById.get(b);
    lines.push({ key, a, b, type: c.type, color: c.type === "shared" ? SHARED_GLOW : GLOW, from: na.position, to: nb.position });
  });

  return { nodesById, allNodes, lines };
}
