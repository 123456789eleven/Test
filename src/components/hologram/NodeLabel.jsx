import { Html } from "@react-three/drei";

// Persistent, camera-facing name label floating just above a node -- real
// styled DOM/CSS (drei's <Html>, not 3D text), so it can reuse the app's
// existing design tokens directly instead of a separate in-scene font/
// material setup. This is the fix for "no clear professional labels" --
// previously a node's name only ever appeared in the hover tooltip
// (HoverLabel), so nothing in the scene was labeled until you pointed at it.
//
// Font size steps down with tier (division largest, function smallest),
// mirroring the existing size hierarchy the nodes themselves already use
// (RADIUS in orgTree.js), so labels read as part of the same hierarchy
// rather than all competing at one size. `yOffset` is the node's own size
// plus a small gap, computed by the caller (Node.jsx/ExternalNode.jsx know
// their own radius already) so the label sits just above the node regardless
// of which tier it is.
const TIER_FONT_SIZE = { 1: "0.74rem", 2: "0.66rem", 3: "0.58rem" };

// Card-format extension (leadership tier, first pass): when a real title/
// rank exist, the label grows from a one-line name pill into a two-line
// card -- name + real title, plus a small rank dot whose size/opacity
// scales with seniority (lower org_titles.rank = more senior = brighter/
// bigger). Never fabricated -- `subtitle`/`rank` are only ever passed for a
// node with a real, resolved title_id; every other node (a synthetic
// "Individual Contributors" cluster included) keeps the plain one-line
// pill exactly as before.
function rankDotStyle(rank) {
  const opacity = Math.max(0.35, Math.min(1, 1.15 - rank * 0.1));
  const size = Math.max(4, Math.min(8, 8 - rank * 0.5));
  return { width: size, height: size, opacity };
}

export default function NodeLabel({ position, yOffset, text, tier = 3, dim = false, variant = "default", subtitle = null, rank = null }) {
  const isCard = !!subtitle;
  return (
    <Html position={[position[0], position[1] + yOffset, position[2]]} center distanceFactor={9} zIndexRange={[10, 0]} occlude={false}>
      <div
        // "department" reads as a section header (uppercase, bolder,
        // letter-spaced) instead of the same plain name-tag style a person
        // node uses -- real departments (Win, Serve, Connect...) need to be
        // visibly a different kind of thing at a glance, not just another
        // label sharing an identical look.
        className={`holo-node-label${variant === "department" ? " holo-node-label-department" : ""}${isCard ? " holo-node-label-card" : ""}`}
        style={{ fontSize: TIER_FONT_SIZE[tier] || TIER_FONT_SIZE[3], opacity: dim ? 0.55 : 1 }}
      >
        <div className="holo-node-label-row">
          {rank ? <span className="holo-node-label-dot" style={rankDotStyle(rank)} /> : null}
          <span>{text}</span>
        </div>
        {isCard ? <div className="holo-node-label-title">{subtitle}</div> : null}
      </div>
    </Html>
  );
}
