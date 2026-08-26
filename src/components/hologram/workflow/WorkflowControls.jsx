// 2D DOM-layer controls for the workflow-simulation feature: pick/start a
// real workflow, stop it, and — the one genuinely interactive moment — choose
// a real branch at a decision point. Deliberately holds no state of its own;
// `simulation` is the exact object useWorkflowSimulation() returns, owned and
// called exactly once by a shared ancestor (Hologram.jsx) so this and the
// pulse animation inside <Canvas> stay in sync as the same state instance.
//
// `workflows` is useWorkflows()'s real rows. Only one exists today, so
// "pick a workflow" and "press play" collapse into the same click — but this
// still renders a real list keyed off real data (not a hardcoded button) so
// a second real workflow just appears here later, no rewrite required.
//
// Known limitation, not solved here: simulation is already bound to whichever
// workflow's steps/transitions Hologram.jsx passed into the hook. Clicking
// any row's Play button calls the same simulation.play() regardless of which
// row it was — correct today since there's exactly one row, but once a
// second real workflow exists, actually switching which workflow's graph the
// hook is playing needs a wiring-level change in Hologram.jsx (e.g. tracking
// a selected workflow id and re-scoping the steps/transitions passed into
// useWorkflowSimulation), not something fixable from inside this component.

const STATUS_LABEL = {
  playing: "Playing",
  "at-decision": "Awaiting decision",
  done: "Complete",
};

export default function WorkflowControls({ simulation, workflows, showFullPath, onToggleFullPath }) {
  const { status, currentStep, availableBranches, play, reset, chooseBranch, graph } = simulation;
  const list = workflows || [];
  const statusLabel = STATUS_LABEL[status] || null;

  return (
    <div className="wf-controls">
      <div className="wf-controls-head">
        <h4 className="wf-controls-title">Simulate a workflow</h4>
        {statusLabel ? (
          // Keyed on status so playing -> at-decision -> done each remount
          // the badge and replay its entrance instead of the label just
          // swapping text/color in place.
          <span key={status} className={`wf-status-badge wf-status-${status}`}>{statusLabel}</span>
        ) : null}
      </div>

      {onToggleFullPath ? (
        <div className="wf-map-toggle-row">
          <button
            type="button"
            className={`wf-map-toggle${showFullPath ? " wf-map-toggle-active" : ""}`}
            onClick={onToggleFullPath}
          >
            {showFullPath ? "🗺️ Showing full path — click to hide" : "🗺️ Show full path at once"}
          </button>
          {showFullPath ? (
            <p className="wf-map-hint">
              Traced at whatever tier is currently expanded — drill into a division/department to see this workflow's
              real step-by-step detail there instead of the coarser division-level view.
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="wf-list">
        {list.map((wf) => {
          // Real, not guessed: currentStep carries its own real workflow_id,
          // so "which workflow is this simulation currently running" is an
          // actual data comparison, not an assumption based on list position.
          const isActive = currentStep?.workflow_id === wf.id;
          const canPlay = status === "idle" || status === "done" || !isActive;
          const label = isActive && status === "playing" ? "Playing…"
            : isActive && status === "at-decision" ? "Choose below ↓"
            : isActive && status === "done" ? "↻ Replay"
            : "▶ Play";
          return (
            <li key={wf.id} className={`wf-list-item${isActive ? " wf-list-item-active" : ""}`}>
              <div className="wf-list-item-info">
                <span className="wf-list-item-name">{wf.name}</span>
                {wf.trigger_description ? <span className="wf-list-item-trigger">{wf.trigger_description}</span> : null}
              </div>
              <button
                type="button"
                className="wf-play-btn"
                disabled={!canPlay}
                onClick={play}
              >
                {label}
              </button>
            </li>
          );
        })}
        {!list.length ? <li className="wf-list-empty">No workflows recorded yet.</li> : null}
      </ul>

      {status !== "idle" ? (
        <button type="button" className="wf-reset-btn" onClick={reset}>■ Reset</button>
      ) : null}

      {status === "at-decision" && availableBranches.length > 0 ? (
        <div className="wf-decision" role="group" aria-label="Choose how the workflow branches">
          <div className="wf-decision-label">⚡ Decision point — choose a path</div>
          <div className="wf-decision-choices">
            {availableBranches.map((branch) => {
              // condition_label is the real, sourced branch text ("Elects
              // COBRA coverage", "Does not elect") — nullable in the schema,
              // so fall back to the real destination step's title rather
              // than showing a blank button.
              const destStep = graph?.stepsById?.get(branch.to_step_id);
              const text = branch.condition_label || destStep?.title || "Continue";
              return (
                <button
                  key={branch.id}
                  type="button"
                  className="wf-decision-choice"
                  onClick={() => chooseBranch(branch.id)}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
