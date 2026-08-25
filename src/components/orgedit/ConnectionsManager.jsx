import { useMemo, useState } from "react";
import { useOrgFunctions, useOrgConnections } from "../hologram/orgQueries";
import { useAddConnection, useDeleteConnection } from "./orgEditApi";
import ModalShell from "./ModalShell";

// Lightweight add/delete list of function-to-function connections — how work
// actually hands off or overlaps between job functions.
export default function ConnectionsManager({ onClose }) {
  const functionsQ = useOrgFunctions();
  const connectionsQ = useOrgConnections();
  const addConnection = useAddConnection();
  const deleteConnection = useDeleteConnection();

  const functions = functionsQ.data || [];
  const rows = useMemo(() => [...(connectionsQ.data || [])].sort((a, b) => String(a.from_id).localeCompare(String(b.from_id))), [connectionsQ.data]);
  const labelById = useMemo(() => {
    const m = new Map();
    functions.forEach((f) => m.set(f.id, f.label));
    return m;
  }, [functions]);
  const funcLabel = (id) => labelById.get(id) || id;

  const [from, setFrom] = useState(functions[0]?.id || "");
  const [to, setTo] = useState(functions[0]?.id || "");
  const [type, setType] = useState("handoff");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function handleAdd() {
    if (from === to) { setError("From and To must be different functions."); return; }
    setError("");
    try {
      await addConnection.mutateAsync({ from_id: from, to_id: to, type, note: note.trim() || null });
      setNote("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this connection?")) return;
    setError("");
    try {
      await deleteConnection.mutateAsync(id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalShell title="Manage connections" sub="How work actually hands off or overlaps between job functions." onClose={onClose}>
      <div className="oe-conn-list">
        {rows.length ? rows.map((c) => (
          <div className="oe-conn-row" key={c.id}>
            <span className="oe-conn-text">
              <b>{funcLabel(c.from_id)}</b> {c.type === "handoff" ? "→" : "⇄"} <b>{funcLabel(c.to_id)}</b>
              <br /><span className="oe-conn-note">{c.note || ""}</span>
            </span>
            <button className="oe-delete-sm" type="button" onClick={() => handleDelete(c.id)} disabled={deleteConnection.isPending}>✕</button>
          </div>
        )) : <p className="oe-empty">None yet.</p>}
      </div>
      <h4>Add a connection</h4>
      <div className="oe-form">
        <label>From
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {functions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label>To
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {functions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label>Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="handoff">Handoff (work passes forward)</option>
            <option value="shared">Shared (same system/data)</option>
          </select>
        </label>
        <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why they connect" /></label>
        <div className="oe-error">{error}</div>
        <div className="oe-actions">
          <button className="oe-save" type="button" onClick={handleAdd} disabled={addConnection.isPending}>Add connection</button>
          <button className="oe-cancel" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </ModalShell>
  );
}
