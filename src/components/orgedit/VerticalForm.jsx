import { useState } from "react";
import { useOrgDivisions, useOrgVerticals, useOrgFunctions } from "../hologram/orgQueries";
import { useSaveVertical, useDeleteVertical } from "./orgEditApi";
import ModalShell from "./ModalShell";

// mode: "add" | "edit". id: vertical id (edit only). divisionId: default
// division to preselect when adding (the tier-1 node that was hovered).
export default function VerticalForm({ mode, id, divisionId, onClose }) {
  const isAdd = mode === "add";
  const divisionsQ = useOrgDivisions();
  const verticalsQ = useOrgVerticals();
  const functionsQ = useOrgFunctions();
  const vertical = isAdd ? null : (verticalsQ.data || []).find((v) => v.id === id);
  const saveVertical = useSaveVertical();
  const deleteVertical = useDeleteVertical();

  const [division, setDivision] = useState(isAdd ? divisionId : vertical?.division || "");
  const [name, setName] = useState(isAdd ? "" : vertical?.name || "");
  const [desc, setDesc] = useState(isAdd ? "" : vertical?.desc || "");
  const [confirmed, setConfirmed] = useState(isAdd ? false : !!vertical?.confirmed);
  const [error, setError] = useState("");

  if (!isAdd && !vertical) {
    return (
      <ModalShell title="Edit department" onClose={onClose}>
        <div className="oe-error">Couldn't find this department — data may still be loading.</div>
      </ModalShell>
    );
  }

  const funcCount = isAdd ? 0 : (functionsQ.data || []).filter((f) => f.vertical === id).length;

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Name is required."); return; }
    setError("");
    try {
      await saveVertical.mutateAsync({
        mode, id,
        payload: { division, name: trimmedName, desc: desc.trim(), confirmed },
      });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    const msg = funcCount
      ? `Delete "${vertical.name}" and its ${funcCount} job function${funcCount === 1 ? "" : "s"}? This can't be undone.`
      : `Delete "${vertical.name}"? This can't be undone.`;
    if (!window.confirm(msg)) return;
    setError("");
    try {
      await deleteVertical.mutateAsync({ id, hasFunctions: funcCount > 0 });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalShell title={isAdd ? "Add department" : "Edit department"} onClose={onClose}>
      <div className="oe-form">
        <label>Division
          <select value={division} onChange={(e) => setDivision(e.target.value)}>
            {(divisionsQ.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Description<textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <label className="oe-checkbox">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Confirmed (vs. estimated)
        </label>
        <div className="oe-error">{error}</div>
        <div className="oe-actions">
          <button className="oe-save" type="button" onClick={handleSave} disabled={saveVertical.isPending}>Save</button>
          <button className="oe-cancel" type="button" onClick={onClose}>Cancel</button>
          {!isAdd ? (
            <button className="oe-delete" type="button" onClick={handleDelete} disabled={deleteVertical.isPending}>Delete department</button>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
