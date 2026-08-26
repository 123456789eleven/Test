const EDIT_KIND = { division: "division", vertical: "vertical", function: "function", person: "person" };

function addKindFor(node) {
  if (node.tier === 1) return node.kind === "corpfn" ? "person" : "vertical";
  if (node.tier === 2 && node.kind === "vertical") return "function";
  return null;
}

// Floating label that follows the pointer over a hovered node, with
// contextual "+ Add"/"Edit" buttons (signed-in only) that open the org-edit
// modal — same fields the original tracked via labelEdit/labelAdd dataset
// attributes, just as props instead.
export default function HoverLabel({ hovered, isSignedIn, onEdit, onAdd, onViewProfile }) {
  if (!hovered) return null;

  const suffix = hovered.expandable
    ? (hovered.expanded ? " (click to collapse)" : " (click to expand)")
    : hovered.isPerson ? " (click for profile)" : "";
  const editKind = EDIT_KIND[hovered.kind] || null;
  const addKind = addKindFor(hovered);
  const addLabel = addKind === "person" ? "+ Add person" : addKind === "function" ? "+ Add function" : "+ Add department";

  return (
    <div
      id="holoLabel"
      className="holo-label"
      // Keyed on the hovered node's own id so moving the pointer straight from
      // one node to another (no gap where the label unmounts) still remounts
      // this element and replays its entrance animation, instead of the
      // fade only ever playing once per hover session.
      key={hovered.id}
      style={{ left: `${hovered.clientX + 14}px`, top: `${hovered.clientY + 14}px` }}
    >
      <span id="holoLabelText">{hovered.name}{suffix}</span>
      {hovered.isPerson && hovered.expandable && onViewProfile ? (
        // A person WITH real direct reports primarily expands on click (see
        // Hologram.jsx's handleClick) -- this is the one place their profile
        // card is still reachable without collapsing/expanding anything.
        // Not signed-in-gated: viewing a profile isn't an edit action.
        <button className="holo-label-edit" type="button" onClick={() => onViewProfile(hovered.id)}>👤 View profile</button>
      ) : null}
      {isSignedIn && addKind ? (
        <button className="holo-label-edit" type="button" onClick={() => onAdd(addKind, hovered.id)}>{addLabel}</button>
      ) : null}
      {isSignedIn && editKind ? (
        <button className="holo-label-edit" type="button" onClick={() => onEdit(editKind, hovered.id, hovered.parentId)}>✎ Edit</button>
      ) : null}
    </div>
  );
}
