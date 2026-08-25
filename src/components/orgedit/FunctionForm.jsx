import { useState } from "react";
import { useOrgVerticals, useOrgFunctions } from "../hologram/orgQueries";
import { useSaveFunction, useDeleteFunction } from "./orgEditApi";
import ModalShell from "./ModalShell";

// mode: "add" | "edit". id: function id (edit only). verticalId: default
// department to preselect when adding.
export default function FunctionForm({ mode, id, verticalId, onClose }) {
  const isAdd = mode === "add";
  const verticalsQ = useOrgVerticals();
  const functionsQ = useOrgFunctions();
  const func = isAdd ? null : (functionsQ.data || []).find((f) => f.id === id);
  const saveFunction = useSaveFunction();
  const deleteFunction = useDeleteFunction();

  const [vertical, setVertical] = useState(isAdd ? verticalId : func?.vertical || "");
  const [label, setLabel] = useState(isAdd ? "" : func?.label || "");
  const [confirmed, setConfirmed] = useState(isAdd ? false : !!func?.confirmed);
  const [error, setError] = useState("");

  if (!isAdd && !func) {
    return (
      <ModalShell title="Edit job function" onClose={onClose}>
        <div className="oe-error">Couldn't find this job function — data may still be loading.</div>
      </ModalShell>
    );
  }

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) { setError("Label is required."); return; }
    setError("");
    try {
      await saveFunction.mutateAsync({ mode, id, payload: { vertical, label: trimmedLabel, confirmed } });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${func.label}"? Any modeled connections to/from it go too. This can't be undone.`)) return;
    setError("");
    try {
      await deleteFunction.mutateAsync({ id });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalShell title={isAdd ? "Add job function" : "Edit job function"} onClose={onClose}>
      <div className="oe-form">
        <label>Department
          <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
            {(verticalsQ.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label>Label<input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <label className="oe-checkbox">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Confirmed (vs. estimated)
        </label>
        <div className="oe-error">{error}</div>
        <div className="oe-actions">
          <button className="oe-save" type="button" onClick={handleSave} disabled={saveFunction.isPending}>Save</button>
          <button className="oe-cancel" type="button" onClick={onClose}>Cancel</button>
          {!isAdd ? (
            <button className="oe-delete" type="button" onClick={handleDelete} disabled={deleteFunction.isPending}>Delete function</button>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
