// Real-people profile overlay — opened by clicking a Corporate Functions
// person node (previously a no-op click, see computeVisibleNodes' isPerson
// nodes always having expandable:false). Resolves manager/direct-reports off
// the FULL org_people roster (peopleById), not just the ~130-person subset
// that gets a 3D node, so clicking "Reports to"/a direct report can walk the
// real chain across the whole company, including people who never get an
// individual node in the scene themselves.
export default function PersonCard({ personId, peopleById, titlesById, onClose, onSelectPerson }) {
  if (!personId || !peopleById) return null;
  const person = peopleById.get(personId);
  if (!person) return null;

  const manager = person.manager_id ? peopleById.get(person.manager_id) : null;
  const reports = [...peopleById.values()]
    .filter((p) => p.manager_id === personId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rankLabel = person.title_id ? titlesById?.get(person.title_id)?.label : null;

  return (
    // Keyed on personId — clicking straight from one person's card to
    // another (via the manager/report links below) still remounts the panel
    // and replays its entrance, same convention as DetailPanel/WorkflowStepInfo.
    <div className="holo-detail holo-person-card" key={personId}>
      <button className="holo-detail-close" type="button" onClick={onClose}>✕</button>
      <h4>{person.name}</h4>
      <div className="holo-person-headline">
        {person.title ? <span className="holo-person-title">{person.title}</span> : null}
        {rankLabel ? <span className="holo-person-rank">{rankLabel}</span> : null}
      </div>
      {person.note ? <p className="holo-person-note">{person.note}</p> : null}

      <div className="holo-person-section">
        <div className="holo-person-section-label">Reports to</div>
        {manager ? (
          <button type="button" className="holo-person-link" onClick={() => onSelectPerson(manager.id)}>
            {manager.name}{manager.title ? ` — ${manager.title}` : ""}
          </button>
        ) : (
          <p className="holo-person-empty">No manager recorded.</p>
        )}
      </div>

      <div className="holo-person-section">
        <div className="holo-person-section-label">Direct reports{reports.length ? ` (${reports.length})` : ""}</div>
        {reports.length ? (
          <ul className="holo-person-reports">
            {reports.map((r) => (
              <li key={r.id}>
                <button type="button" className="holo-person-link" onClick={() => onSelectPerson(r.id)}>
                  {r.name}{r.title ? ` — ${r.title}` : ""}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="holo-person-empty">No direct reports recorded.</p>
        )}
      </div>
    </div>
  );
}
