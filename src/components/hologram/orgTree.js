// Pure, React/Three-agnostic logic for the Hologram scene's hierarchy: which
// nodes exist at each tier, where they sit, and how connections resolve to
// whichever tier is currently on screen. Kept free of any rendering concerns
// so the accordion/progressive-disclosure math can be read (and checked)
// on its own, the same way the original buildScene()'s bookkeeping could be
// read independent of its Three.js calls.

export const EXEC_IDS = ["fx3", "frankIII"];
export const DIVISION_ORDER = ["strategies", "advantage", "payroll", "advisory"];
export const RADIUS = { division: 0.75, vertical: 0.34, function: 0.19 };
// A coordinated 3-family palette anchored in the app's own Aurora tokens
// (tokens.css: --accent violet, --manager amber) rather than each feature
// round picking its own unrelated hue -- violet for "real/internal" signal,
// amber for "secondary/hierarchy" emphasis, a dark plum neutral for "no
// data yet" so it recedes into the same dark world instead of standing out
// as its own unrelated blue-gray.
export const GLOW = 0x8b7cf0; // --accent violet -- real handoff connections
export const SHARED_GLOW = 0xe0a15c; // --manager amber -- shared connections
export const QUIET = 0x2e2840; // dark plum-neutral, matches --surface-alt's undertone
export const PEOPLE_GLOW = 0xa599e8; // lighter violet -- person node fill, same family as GLOW

// tier1 -> tier2 (division/corpfn -> vertical/person) and tier2 -> tier3
// (vertical -> function) each get their own outward/downward step, matching
// the original's two expansion "styles". tier2->tier3 also keeps its own
// fixed wedge (TIER2_WEDGE) -- functions are small and few enough per
// vertical that a fixed total angle has never been a problem there.
const TIER1_OUTWARD = 1.9, TIER1_YSTEP = -0.65;
const TIER2_WEDGE = 0.5, TIER2_OUTWARD = 1.6, TIER2_YSTEP = -0.55;

// A real division's departments (verticals) are the primary, first-level
// content at tier2 -- centered at the parent's own angle, the same position
// the sole content used to occupy before people were added here. Real
// people/teams get their own clearly secondary sector, offset by this fixed
// angle so the two never blend into one ring -- comfortably clears both
// sectors' capped wedge widths (personWedge tops out at 1.05 rad / 2, so two
// sectors 2*0.75=1.5 rad apart never overlap even at max width).
const SECTOR_GAP = 0.75;

// Person batches (entry points, or any depth of real direct reports) get an
// ADAPTIVE wedge instead of a fixed one: a guaranteed minimum angular gap
// between siblings, growing the total wedge with count rather than
// squeezing an ever-larger batch into the same fixed budget. Capped so it
// never sprawls past one division's own "lane" (tier1 neighbors sit 2*PI/5
// = ~1.257 rad apart). Once even this capped wedge can't honor the minimum
// gap, SPIRAL_THRESHOLD below hands off to the phyllotaxis spiral instead,
// which is already proven to space an arbitrary count without overlap.
// Retuned for the card-format labels (2 lines + a rank dot -- meaningfully
// bigger than the 1-line pill this was originally sized against). Real
// case: Strategies has exactly 2 entry points, so personWedge(2) was
// literally just this one constant (MIN_STEP * (2-1)) -- there was no
// larger formula masking it. Chose a systematic retune (this constant +
// SPIRAL_THRESHOLD below) over nudging the two colliding nodes by hand,
// since a one-off nudge wouldn't hold as more tiers get the card treatment
// and every other division with a small entry-point count hits the exact
// same formula.
const MIN_PERSON_ANGLE_STEP = 0.3;
const MAX_PERSON_WEDGE = 1.05;
function personWedge(count) {
  return Math.min(MAX_PERSON_WEDGE, MIN_PERSON_ANGLE_STEP * Math.max(1, count - 1));
}

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

// Beyond this many children, even personWedge()'s adaptive, capped wedge
// can no longer honor its own guaranteed minimum gap -- at the new, bigger
// MIN_PERSON_ANGLE_STEP (0.3), that's counts of 5+ (0.3*4=1.2 > the 1.05
// cap), so this is lowered from 8 to keep the wedge branch's own promise
// intact for its whole real range (1-4) rather than let it silently
// compress again right where the last fix left off. spiralPositions()
// below is the more robust choice past that point, a phyllotaxis spiral
// that's already proven to space an arbitrary count without overlap.
// Every other expansion in the scene (division wedge, vertical->function
// wedge) is untouched.
const SPIRAL_THRESHOLD = 5;
// Beyond this many siblings in a single batch, the always-on floating
// NodeLabel gets suppressed (hover still shows the name either way) -- the
// real fix for "Corporate Functions reads as a wall of clutter": 132
// persistent name badges layered over a spiral is the actual sloppy part,
// not the spiral math itself. A cut, not an added effect, matching how this
// app's visual feedback has resolved every other time.
const LABEL_DENSE_THRESHOLD = 10;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.39996 rad (~137.5deg) -- the standard phyllotaxis/"sunflower" stepping angle that spaces an arbitrary number of points with no two ever radiating along the same line
// radius-per-sqrt(index) growth. Bumped again (0.5 -> 0.65) alongside the
// SPIRAL_THRESHOLD drop above -- counts 5-8 (e.g. Advantage's real 8-node
// mixed batch) now land in the spiral instead of the wedge, and those
// counts are squarely inside where the card-format label actually renders
// (LABEL_DENSE_THRESHOLD is 10), so this range needs real card-sized
// spacing, not just bare-geometry spacing. Real minimum nearest-neighbor
// spacing is roughly SPIRAL_STEP*1.2 -- ~0.78 units at 0.65, up from ~0.6.
// Still comfortably inside the ~6.5 units between neighboring divisions
// even at the largest real count this spiral handles (~20).
const SPIRAL_STEP = 0.65;

// A phyllotaxis spiral centered on a world position at the parent's own
// radius but (optionally) a different angle -- not the scene origin --
// capped by how far it grows outward, not by an angular wedge, so it fans
// out without reaching into a neighboring division's space (tier1 neighbors
// sit ~6.5 units apart; this spiral's radius at realistic counts stays well
// inside that). `anchorAngle` defaults to the parent's own angle (today's
// behavior, unchanged for corpfn/personPath callers); a caller placing a
// second independent batch under the same parent (e.g. a division's people,
// separate from its verticals) can pass a different anchor so the two
// batches' spirals -- if either ever needs one -- don't share a center.
// Returns {angle, radius} pairs (not raw x/z) so the existing place()'s
// x=cos*r, z=sin*r math still applies unchanged.
function spiralPositions(count, parent, anchorAngle = parent.angle) {
  const px = Math.cos(anchorAngle) * parent.radius;
  const pz = Math.sin(anchorAngle) * parent.radius;
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
// Pushed out from 9.6 -- only 1.0 unit past the base disc's own 8.6-unit
// edge, which left little real clearance from a deeply-drilled org chain's
// own outward growth (a person-tier card was reported sitting directly
// against the Client/Employer node). This is a genuine cross-system gap:
// the org accordion and the external-stakeholder ring were never designed
// with each other's on-screen footprint in mind, so more radial buffer is
// the direct fix rather than trying to cap how far org chains can grow.
const EXTERNAL_RADIUS = 11.5, EXTERNAL_Y = 0.4;

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

// The step->function resolution rule shared by resolveStepLocation (3D
// position) and describeStepOwner (text label): task_id -> tasks.function_id
// (existing, preferred, most specific) -> function_id (direct). Pulled out
// on its own so both callers agree on the exact same priority instead of two
// copies quietly drifting apart.
export function resolveStepFunctionId(step, tasksById) {
  const taskFunctionId = step.task_id ? (tasksById[step.task_id] || {}).function_id : null;
  return taskFunctionId || step.function_id || null;
}

// Resolves a real workflow_steps row to wherever it should animate toward:
// resolveStepFunctionId (existing, preferred, most specific) ->
// stakeholder_id (external) -> unresolved. Never fabricates a location a
// step doesn't actually have -- callers must handle `kind: "unresolved"`
// explicitly (e.g. skip the hop, or hold position) rather than this function
// guessing on their behalf.
export function resolveStepLocation(step, { tasksById, sceneState, nodesById, externalNodesById }) {
  const functionId = resolveStepFunctionId(step, tasksById);
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

// Same resolution priority as resolveStepLocation (function -> stakeholder ->
// unresolved), but returns a human-readable owner label instead of a 3D
// position -- for the workflow card's text outline, which has no on-screen
// node to point at. Deliberately doesn't fall back through resolveVisible's
// coarser tiers (division/vertical) the way the 3D scene does, since a
// text label can just name the function/vertical/division directly rather
// than needing "whichever tier happens to be expanded right now."
export function describeStepOwner(step, { tasksById, functionsById, sceneState, externalNodesById }) {
  const functionId = resolveStepFunctionId(step, tasksById);
  if (functionId) {
    const fn = functionsById[functionId];
    if (fn) {
      const verticalId = findVerticalOf(functionId, sceneState.verticals);
      const vertical = verticalId ? sceneState.verticals[verticalId] : null;
      const division = vertical ? sceneState.divisions.find((d) => d.id === vertical.division) : null;
      return { label: fn.label, division: division ? division.name : null, vertical: vertical ? vertical.name : null };
    }
  }
  if (step.stakeholder_id && externalNodesById && externalNodesById.has(step.stakeholder_id)) {
    return { label: externalNodesById.get(step.stakeholder_id).name, external: true };
  }
  return null;
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

// The 5 real values org_people.parent ever takes -- corpfn's own tier1 node
// id is "corpfn", but its people are bucketed under "root" (matches how
// EXEC_IDS/corpfn filtering has always worked), so every other lookup that
// needs "which bucket does this tier1 node's people live in" goes through
// this one mapping rather than each call site re-deriving it.
const PEOPLE_BUCKET_IDS = ["root", "strategies", "advantage", "payroll", "advisory"];
export function peopleBucketFor(tier1Id) {
  return tier1Id === "corpfn" ? "root" : tier1Id;
}

// Once a bucket has more solo individual-contributor entry points than this
// (no real reports of their own), they collapse into one synthetic
// "Individual Contributors (N)" cluster instead of showing as N separate
// nodes. Real data: every bucket except Advantage has at most 1 solo IC
// among its entry points (no clustering ever triggers there); Advantage has
// 14. Real team leads (an entry point WITH reports) are never clustered --
// each stays its own node, same as before, just with its real team size
// appended to the display name.
const SOLO_CLUSTER_THRESHOLD = 3;

// Collapses one bucket's raw entry-point list into the final placeable set:
// team leads (kept individual, name gets a real "(count)" suffix) plus
// either the solo ICs directly (few enough to just show) or one synthetic
// cluster node standing in for all of them. The cluster is registered in
// reportsByManagerId under its own synthetic id with the real solo ICs as
// its "reports" -- so the existing recursive drill-down (toggleInPath,
// placeNodeBatch) can expand it with no new interaction-model code at
// all: a cluster is just a person-shaped node that happens to have real
// people as its reports.
function groupEntryPoints(entryPoints, reportsByManagerId, bucketId) {
  const grouped = [];
  const soloICs = [];
  entryPoints.forEach((p) => {
    const reports = reportsByManagerId.get(p.id) || [];
    if (reports.length > 0) grouped.push({ ...p, name: `${p.name} (${reports.length})` });
    else soloICs.push(p);
  });
  if (soloICs.length > SOLO_CLUSTER_THRESHOLD) {
    const clusterId = `${bucketId}__ic`;
    reportsByManagerId.set(clusterId, soloICs);
    grouped.push({ id: clusterId, name: `Individual Contributors (${soloICs.length})`, managerId: null, isCluster: true });
  } else {
    grouped.push(...soloICs);
  }
  return grouped;
}

// Real entry points per bucket (manager_id null, or pointing at someone
// outside this same bucket -- a real cross-division reporting line, kept
// fully correct in that person's own PersonCard, just not rendered as a 3D
// child inside a tree it doesn't belong to) and real direct-report lists
// scoped to the same bucket as the manager. Computed once from the full
// roster rather than per-render, since every division genuinely has its own
// people (root 132, strategies 60, advantage 177, payroll 66, advisory 29 --
// verified against the live table, not assumed), not just Corporate
// Functions. Entry points are further grouped via groupEntryPoints (see
// above) before being returned, so a caller never has to think about the
// raw-vs-clustered distinction itself.
function computePeopleHierarchy(leadership) {
  const byId = new Map((leadership || []).map((p) => [p.id, p]));
  const entryPointsByBucket = {};
  PEOPLE_BUCKET_IDS.forEach((b) => { entryPointsByBucket[b] = []; });
  const reportsByManagerId = new Map();

  (leadership || []).forEach((p) => {
    if (EXEC_IDS.includes(p.id)) return; // never placed as a node themselves, same exclusion as before
    const mgr = p.managerId ? byId.get(p.managerId) : null;
    const sameBucketManager = mgr && mgr.parent === p.parent;
    if (!sameBucketManager && entryPointsByBucket[p.parent]) entryPointsByBucket[p.parent].push(p);
    if (sameBucketManager) {
      if (!reportsByManagerId.has(p.managerId)) reportsByManagerId.set(p.managerId, []);
      reportsByManagerId.get(p.managerId).push(p);
    }
  });
  PEOPLE_BUCKET_IDS.forEach((b) => {
    entryPointsByBucket[b] = groupEntryPoints(entryPointsByBucket[b], reportsByManagerId, b);
  });
  return { entryPointsByBucket, reportsByManagerId };
}

// The one piece of real logic the arbitrary-depth people drill-down needs:
// given the current drill path and whichever person node was just clicked,
// decide the next path. Three cases, same "one branch open per level" rule
// the rest of this accordion already follows, just generalized past a fixed
// two tiers: clicking a node already on the path collapses back to it (and
// everything below); clicking a direct child of the current deepest node
// extends the path one level; clicking anything else (an entry point, or a
// sibling not on the current path) starts a fresh single-item path.
export function toggleInPath(path, clickedId, clickedParentId) {
  const idx = path.indexOf(clickedId);
  if (idx !== -1) return path.slice(0, idx);
  const parentIdx = path.indexOf(clickedParentId);
  if (parentIdx !== -1) return [...path.slice(0, parentIdx + 1), clickedId];
  return [clickedId];
}

// Mirrors the old buildState(): derives the fixed tier-1 list plus which
// divisions/verticals/functions currently have any modeled connection at all
// (used only to pick a node's "quiet" vs "glowing" color — connectivity
// itself never changes what's expandable or visible).
export function buildSceneState(data) {
  const verticals = data.verticals || {};
  const divisions = DIVISION_ORDER.map((id) => (data.divisions || []).find((d) => d.id === id)).filter(Boolean);
  const { entryPointsByBucket, reportsByManagerId } = computePeopleHierarchy(data.leadership);
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

  return {
    verticals, divisions, entryPointsByBucket, reportsByManagerId, tier1,
    funcConnected, vertConnected, divConnected, processConnections: data.processConnections || [],
  };
}

function colorAndConnected(sceneState, tier, item, isPerson) {
  let connected;
  if (tier === 1) connected = item.isCorpfn ? sceneState.entryPointsByBucket.root.length > 0 : sceneState.divConnected.has(item.id);
  else if (tier === 2) connected = isPerson ? true : sceneState.vertConnected.has(item.id);
  else connected = sceneState.funcConnected.has(item.id);
  const color = isPerson ? PEOPLE_GLOW : connected ? GLOW : QUIET;
  return { connected, color };
}

// Places one batch of same-depth tier2 nodes -- department verticals, entry-
// point people, or one manager's/cluster's direct reports -- around a
// parent, centered on the given angle rather than always the parent's own,
// so two independent batches under the same parent (a division's verticals
// and its people) can each get their own clearly separated sector instead
// of blending into one combined ring. Picks the spiral vs wedge-fan layout
// off THIS batch's own count (not any other batch sharing the parent), and
// suppresses labels once the batch is genuinely dense. Purely geometric --
// callers pre-shape their own items (isPerson/managerId/hasReports/
// isCluster for people, plain {id,name} for verticals), so this function
// doesn't need to know which kind of thing it's placing.
function placeNodeBatch(place, items, parent, centerAngle, outward, ystep) {
  if (!items.length) return;
  const showLabel = items.length <= LABEL_DENSE_THRESHOLD;
  if (items.length > SPIRAL_THRESHOLD) {
    const spiral = spiralPositions(items.length, parent, centerAngle);
    items.forEach((child, i) => place(child, 2, spiral[i].angle, spiral[i].radius, parent.y + ystep + spiral[i].yOffset, parent.id, { showLabel }));
  } else {
    const angles = distributeAngles(centerAngle, items.length, personWedge(items.length));
    items.forEach((child, i) => place(child, 2, angles[i], parent.radius + outward, parent.y + ystep, parent.id, { showLabel }));
  }
}

// Shapes a raw entry-point/report row into the item shape place()/
// placeNodeBatch expect for a person-kind tier2 node -- shared by every
// call site below so the isPerson/managerId/hasReports/isCluster fields
// never quietly drift out of sync between them.
function personItem(p, reportsByManagerId) {
  return {
    id: p.id, name: p.name, isPerson: true, managerId: p.managerId, isCluster: !!p.isCluster,
    hasReports: (reportsByManagerId.get(p.id) || []).length > 0,
    // Real title/rank for the card-format label (Node.jsx resolves titleId
    // -> a rank label via a titlesById map passed in from the rendering
    // layer -- orgTree.js stays free of that lookup, just carries the raw
    // id through). Undefined for a synthetic cluster (p.title/titleId never
    // set on one) -- rendered as an honest no-title-line state, never a
    // fabricated rank.
    title: p.title || null,
    titleId: p.titleId || null,
  };
}

// Full recompute of every currently-visible node (tier1 always, tier2 under
// expandedTier1, tier3 under expandedTier2, plus an arbitrary-depth chain of
// person nodes under personPath) plus the connection lines between them,
// resolved to whichever tier is on screen for each endpoint. Cheap at this
// data size and correct by construction on every expand/collapse — same
// tradeoff the original's rebuildLines() made.
export function computeVisibleNodes(sceneState, expandedTier1, expandedTier2, personPath = []) {
  const nodesById = new Map();
  const allNodes = [];

  function place(item, tier, angle, radius, y, parentId, opts = {}) {
    const { showLabel = true } = opts;
    const isPerson = !!item.isPerson;
    const isCluster = !!item.isCluster;
    const size = tier === 1 ? RADIUS.division : tier === 2 ? RADIUS.vertical : RADIUS.function;
    const { color } = colorAndConnected(sceneState, tier, item, isPerson);
    // Raised from 0.3/0.34/0.38 -- that low, and uniform across the whole
    // mesh (meshBasicMaterial's opacity has no fresnel/edge weighting of
    // its own), meant every node's body read as barely-there, especially
    // once idle breathing multiplied it down further (as low as ~0.26 at
    // the low point of the cycle). The hologram "glow and fade" effect
    // already lives in the separate, correctly fresnel-weighted rim shell
    // (Node.jsx's additive rim shader) -- this fill's only job is a
    // legible, solid-reading body, so it now stays high and stable instead
    // of competing with the rim for the same visual effect.
    const opacity = tier === 1 ? 0.85 : tier === 2 ? 0.88 : 0.92;
    // A synthetic cluster ("Individual Contributors (N)") gets its own kind
    // rather than "person" -- HoverLabel's EDIT_KIND/addKindFor only
    // recognize known kind strings, so this alone keeps the Edit/+Add
    // buttons from ever appearing for a node that has no real PersonForm
    // row behind it, with no changes needed in HoverLabel's kind-matching
    // logic itself.
    const kind = tier === 1 ? (item.isCorpfn ? "corpfn" : "division")
      : tier === 2 ? (isPerson ? (isCluster ? "person-cluster" : "person") : "vertical")
      : "function";
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const expandable = isPerson ? !!item.hasReports : tier < 3;
    const expanded = tier === 1 ? item.id === expandedTier1
      : tier === 2 ? (isPerson ? personPath.includes(item.id) : item.id === expandedTier2)
      : false;
    const node = {
      id: item.id, name: item.name, tier, kind, isPerson, isCluster, parentId,
      angle, radius, y, position: [x, y, z], size, color, opacity, expandable, expanded, showLabel,
      managerId: isPerson ? item.managerId || null : null,
      title: isPerson ? item.title || null : null,
      titleId: isPerson ? item.titleId || null : null,
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
      const bucketId = peopleBucketFor(parent.id);
      const entryPeople = sceneState.entryPointsByBucket[bucketId] || [];
      if (parent.kind === "corpfn") {
        // Corporate Functions has no verticals of its own -- only real
        // entry-point people (a small, real handful, not the full 132-person
        // roster this used to flat-place at once).
        const personItems = entryPeople.map((p) => personItem(p, sceneState.reportsByManagerId));
        placeNodeBatch(place, personItems, parent, parent.angle, TIER1_OUTWARD, TIER1_YSTEP);
      } else {
        // A real division's departments are the primary, first-level tier2
        // content -- centered at the parent's own angle, same position the
        // sole content occupied before people existed here. Real people/
        // teams get their own clearly secondary sector, offset by
        // SECTOR_GAP, and each sector picks its own wedge-vs-spiral layout
        // off ITS OWN count -- not a combined total -- so one group's size
        // never forces the other into a different layout.
        const verticalItems = Object.entries(sceneState.verticals).filter(([, v]) => v.division === parent.id).map(([id, v]) => ({ id, name: v.name }));
        const personItems = entryPeople.map((p) => personItem(p, sceneState.reportsByManagerId));
        placeNodeBatch(place, verticalItems, parent, parent.angle, TIER1_OUTWARD, TIER1_YSTEP);
        placeNodeBatch(place, personItems, parent, parent.angle + SECTOR_GAP, TIER1_OUTWARD, TIER1_YSTEP);
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

  // Arbitrary-depth people drill-down: real manager_id chains run up to 7
  // levels deep (verified against the live table), so unlike vertical/
  // function this can't be two fixed blocks -- personPath is walked one
  // real level at a time, each entry's node already placed by the previous
  // iteration (or the tier2 batch above, for personPath[0]).
  for (const personId of personPath) {
    const personNode = nodesById.get(personId);
    if (!personNode) break; // a stale path segment -- stop rather than guessing a position for it
    const reports = sceneState.reportsByManagerId.get(personId) || [];
    if (!reports.length) break;
    const items = reports.map((p) => personItem(p, sceneState.reportsByManagerId));
    placeNodeBatch(place, items, personNode, personNode.angle, TIER2_OUTWARD, TIER2_YSTEP);
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
