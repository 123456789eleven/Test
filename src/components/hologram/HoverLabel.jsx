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
export default function HoverLabel({ hovered, isSignedIn, onEdit, onAdd }) {
  if (!hovered) return null;

  const suffix = hovered.expandable ? (hovered.expanded ? " (click to collapse)" : " (click to expand)") : "";
  const editKind = EDIT_KIND[hovered.kind] || null;
  const addKind = addKindFor(hovered);
  const addLabel = addKind === "person" ? "+ Add person" : addKind === "function" ? "+ Add function" : "+ Add department";

  return (
    <div id="holoLabel" className="holo-label" style={{ left: `${hovered.clientX + 14}px`, top: `${hovered.clientY + 14}px` }}>
      <span id="holoLabelText">{hovered.name}{suffix}</span>
      {isSignedIn && addKind ? (
        <button className="holo-label-edit" type="button" onClick={() => onAdd(addKind, hovered.id)}>{addLabel}</button>
      ) : null}
      {isSignedIn && editKind ? (
        <button className="holo-label-edit" type="button" onClick={() => onEdit(editKind, hovered.id, hovered.parentId)}>✎ Edit</button>
      ) : null}
    </div>
  );
}
