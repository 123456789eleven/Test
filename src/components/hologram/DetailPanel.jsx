// The function-level detail panel — opened by clicking a tier-3 (job
// function) node in place of expanding further, since functions have no
// children of their own. Rendered outside the <Canvas> as plain HTML.
export default function DetailPanel({ name, tasks, onClose }) {
  return (
    // Keyed on `name` so switching straight from one function's panel to
    // another's (no close/reopen in between) still remounts the panel and
    // replays its entrance animation rather than silently swapping content.
    <div id="holoDetail" className="holo-detail" key={name}>
      <button className="holo-detail-close" type="button" onClick={onClose}>✕</button>
      <h4>{name}</h4>
      {tasks.length ? (
        tasks.map((t) => (
          <div className="holo-detail-task" key={t.id}>
            <div className="holo-detail-task-name">{t.name}</div>
            {t.description ? <div className="holo-detail-task-desc">{t.description}</div> : null}
            {t.tools.length ? (
              <div className="holo-detail-tools">
                {t.tools.map((tool) => (
                  <span className="holo-tool-chip" key={tool.id}>{tool.name}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <p className="cmap-detail-empty">No tasks recorded yet for this function.</p>
      )}
    </div>
  );
}
