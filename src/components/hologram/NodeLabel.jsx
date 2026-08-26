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

export default function NodeLabel({ position, yOffset, text, tier = 3, dim = false, variant = "default" }) {
  return (
    <Html position={[position[0], position[1] + yOffset, position[2]]} center distanceFactor={9} zIndexRange={[10, 0]} occlude={false}>
      <div
        // "department" reads as a section header (uppercase, bolder,
        // letter-spaced) instead of the same plain name-tag style a person
        // node uses -- real departments (Win, Serve, Connect...) need to be
        // visibly a different kind of thing at a glance, not just another
        // label sharing an identical look.
        className={`holo-node-label${variant === "department" ? " holo-node-label-department" : ""}`}
        style={{ fontSize: TIER_FONT_SIZE[tier] || TIER_FONT_SIZE[3], opacity: dim ? 0.55 : 1 }}
      >
        {text}
      </div>
    </Html>
  );
}
