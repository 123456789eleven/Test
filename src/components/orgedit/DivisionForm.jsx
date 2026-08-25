import { useState } from "react";
import { useOrgDivisions } from "../hologram/orgQueries";
import { useSaveDivision } from "./orgEditApi";
import ModalShell from "./ModalShell";

// Divisions are edit-only by design — no add/delete, the four divisions are
// fixed. Text fields only; competitor benchmarks aren't editable here.
export default function DivisionForm({ id, onClose }) {
  const divisionsQ = useOrgDivisions();
  const division = (divisionsQ.data || []).find((d) => d.id === id);
  const saveDivision = useSaveDivision();

  const [name, setName] = useState(division?.name || "");
  const [role, setRole] = useState(division?.role || "");
  const [desc, setDesc] = useState(division?.desc || "");
  const [scale, setScale] = useState(division?.scale || "");
  const [unit, setUnit] = useState(division?.unit || "");
  const [caption, setCaption] = useState(division?.caption || "");
  const [error, setError] = useState("");

  if (!division) {
    return (
      <ModalShell title="Edit division" onClose={onClose}>
        <div className="oe-error">Couldn't find this division — data may still be loading.</div>
      </ModalShell>
    );
  }

  async function handleSave() {
    setError("");
    try {
      await saveDivision.mutateAsync({
        id,
        payload: { name: name.trim(), role: role.trim(), desc: desc.trim(), scale: scale.trim(), unit: unit.trim(), caption: caption.trim() },
      });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalShell title="Edit division" sub="Text fields only — competitor benchmarks aren't editable here." onClose={onClose}>
      <div className="oe-form">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Role (short tag)<input value={role} onChange={(e) => setRole(e.target.value)} /></label>
        <label>Description<textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <label>Scale note<textarea value={scale} onChange={(e) => setScale(e.target.value)} /></label>
        <label>Unit label<input value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
        <label>Chart caption<textarea value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
        <div className="oe-error">{error}</div>
        <div className="oe-actions">
          <button className="oe-save" type="button" onClick={handleSave} disabled={saveDivision.isPending}>Save</button>
          <button className="oe-cancel" type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </ModalShell>
  );
}
