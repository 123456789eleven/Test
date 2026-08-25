import { useState } from "react";
import { useOrgDivisions, useOrgPeople } from "../hologram/orgQueries";
import { useSavePerson, useDeletePerson } from "./orgEditApi";
import ModalShell from "./ModalShell";

// mode: "add" | "edit". id: person id (edit only). defaultParent: default
// "reports into" value when adding — note this can arrive as "corpfn" (the
// id of the synthetic Corporate Functions tier-1 node, when adding a person
// by hovering it), which isn't a real option in this dropdown (only "root"
// and the four divisions are). The original's plain <select> silently fell
// back to its first option ("root") in that case, via an unmatched
// `selected` attribute — root is also the actually-correct value, since
// Corporate Functions' people are exactly leadership.parent === "root".
// Clamping here reproduces that real fallback rather than a literal (and,
// for a React controlled <select>, broken) pass-through of "corpfn".
function clampParent(value, divisions) {
  if (value === "root" || divisions.some((d) => d.id === value)) return value;
  return "root";
}

export default function PersonForm({ mode, id, defaultParent, onClose }) {
  const isAdd = mode === "add";
  const divisionsQ = useOrgDivisions();
  const divisions = divisionsQ.data || [];
  const peopleQ = useOrgPeople();
  const person = isAdd ? null : (peopleQ.data || []).find((p) => p.id === id);
  const savePerson = useSavePerson();
  const deletePerson = useDeletePerson();

  const [name, setName] = useState(isAdd ? "" : person?.name || "");
  const [title, setTitle] = useState(isAdd ? "" : person?.title || "");
  const [note, setNote] = useState(isAdd ? "" : person?.note || "");
  const [parent, setParent] = useState(isAdd ? clampParent(defaultParent || "root", divisions) : person?.parent || "root");
  const [cross, setCross] = useState(new Set(isAdd ? [] : person?.cross_divisions || []));
  const [error, setError] = useState("");

  if (!isAdd && !person) {
    return (
      <ModalShell title="Edit person" onClose={onClose}>
        <div className="oe-error">Couldn't find this person — data may still be loading.</div>
      </ModalShell>
    );
  }

  function toggleCross(divId) {
    setCross((prev) => {
      const next = new Set(prev);
      if (next.has(divId)) next.delete(divId); else next.add(divId);
      return next;
    });
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Name is required."); return; }
    setError("");
    const crossList = Array.from(cross);
    try {
      await savePerson.mutateAsync({
        mode, id,
        payload: { name: trimmedName, title: title.trim(), note: note.trim(), parent, cross_divisions: crossList.length ? crossList : null },
      });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove ${person.name} from the structure? This can't be undone.`)) return;
    setError("");
    try {
      await deletePerson.mutateAsync({ id });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalShell title={isAdd ? "Add person" : "Edit person"} onClose={onClose}>
      <div className="oe-form">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Note (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <label>Reports into
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="root">— none (top level) —</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label>Also connects to (cross-division, optional)</label>
        <div className="oe-checklist">
          {divisions.map((d) => (
            <label className="oe-checkbox" key={d.id}>
              <input type="checkbox" checked={cross.has(d.id)} onChange={() => toggleCross(d.id)} /> {d.name}
            </label>
          ))}
        </div>
        <div className="oe-error">{error}</div>
        <div className="oe-actions">
          <button className="oe-save" type="button" onClick={handleSave} disabled={savePerson.isPending}>Save</button>
          <button className="oe-cancel" type="button" onClick={onClose}>Cancel</button>
          {!isAdd ? (
            <button className="oe-delete" type="button" onClick={handleDelete} disabled={deletePerson.isPending}>Delete person</button>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
