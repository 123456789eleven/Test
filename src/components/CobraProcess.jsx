import { Fragment, useState } from "react";

// React port of window.renderCobraProcess(containerId, data) — recursively
// renders a phase -> step tree where decision-type steps branch into
// labeled columns of further steps. The old module kept a module-level
// IMPROVE_CONCEPTS mutable set as a render side effect; here it's just
// derived from `data.improvementConcepts` each render and threaded down
// as a prop instead.

const ROLE_LABEL = { cobraAdminI: "Admin I", cobraAdminII: "Admin II" };

function isTransition(step) {
  return typeof step.text === "string" && step.text.trim().startsWith("→");
}

function ImproveBadge({ item }) {
  if (!item.improve) return null;
  return (
    <span className="cflow-improve-badge" title="Process-improvement note available">◆</span>
  );
}

function ImprovePanel({ item, improveConcepts }) {
  if (!item.improve) return null;
  const c = improveConcepts[item.improve.concept] || {};
  return (
    <div className="cflow-improve-panel">
      {c.label && <span className="cflow-improve-tag">{c.label}</span>}
      <p className="cflow-improve-note">{item.improve.note}</p>
      {item.improve.ask && (
        <p className="cflow-improve-ask"><strong>Ask yourself:</strong> {item.improve.ask}</p>
      )}
    </div>
  );
}

function Meta({ step }) {
  if (!step.responsibility && !step.time) return null;
  return (
    <div className="cflow-node-meta">
      {step.responsibility && <span className="cobra-badge cobra-badge-who">{step.responsibility}</span>}
      {step.time && <span className="cobra-badge cobra-badge-time">{step.time}</span>}
    </div>
  );
}

function RoleBadge({ role }) {
  if (!role) return null;
  return <span className={`cflow-role-badge cflow-role-${role}`}>{ROLE_LABEL[role] || role}</span>;
}

function CobraSteps({ steps, improveConcepts, roleFilter }) {
  return steps.map((step, i) => (
    <CobraStep
      key={i}
      step={step}
      hasNext={i < steps.length - 1}
      improveConcepts={improveConcepts}
      roleFilter={roleFilter}
    />
  ));
}

function CobraStep({ step, hasNext, improveConcepts, roleFilter }) {
  const dim = roleFilter !== "all" && step.role !== roleFilter;
  const connector = hasNext ? <div className="cflow-connector" /> : null;

  if (step.type === "decision") {
    const nodeClass = ["cflow-node", "cflow-decision", dim ? "cflow-dim" : ""].filter(Boolean).join(" ");
    return (
      <>
        <div className="cflow-step">
          <div className={nodeClass} data-role={step.role || undefined}>
            <RoleBadge role={step.role} />
            <div className="cflow-node-text">{step.text}</div>
            <ImproveBadge item={step} />
          </div>
          <ImprovePanel item={step} improveConcepts={improveConcepts} />
          <div className={`cflow-fork${step.branches.length < 2 ? " cflow-fork-single" : ""}`}>
            {step.branches.map((b, bi) => (
              <div className="cflow-branch-col" key={bi}>
                <div className="cflow-branch-label">{b.label}</div>
                {b.steps && b.steps.length ? (
                  <div className="cflow">
                    <CobraSteps steps={b.steps} improveConcepts={improveConcepts} roleFilter={roleFilter} />
                  </div>
                ) : (
                  <div className="cflow-branch-empty">No further step recorded — continues</div>
                )}
              </div>
            ))}
          </div>
        </div>
        {connector}
      </>
    );
  }

  const nodeClass = ["cflow-node", isTransition(step) ? "cflow-transition" : "cflow-process", dim ? "cflow-dim" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className="cflow-step">
        <div className={nodeClass} data-role={step.role || undefined}>
          <RoleBadge role={step.role} />
          <div className="cflow-node-text">{step.text}</div>
          <ImproveBadge item={step} />
          <Meta step={step} />
        </div>
        <ImprovePanel item={step} improveConcepts={improveConcepts} />
      </div>
      {connector}
    </>
  );
}

function PhaseMarker({ phase, index }) {
  return (
    <>
      <div className="cflow-step">
        <div className="cflow-phase-marker">
          <span className="cflow-phase-num">{index + 1}</span>
          <span className="cflow-phase-title">{phase.title}</span>
        </div>
      </div>
      <div className="cflow-connector" />
    </>
  );
}

function RolesCard({ data, roleFilter, onRoleFilter }) {
  if (!data.roles) return null;
  const entries = Object.entries(data.roles);
  return (
    <div className="cobra-roles">
      <h4>Who does what — your actual workday</h4>
      {data.rolesNote && <p className="cobra-roles-note">{data.rolesNote}</p>}
      <div className="cobra-roles-grid">
        {entries.map(([key, r]) => (
          <div className={`cobra-role-card cobra-role-${key}`} key={key}>
            <h5>{r.title}<ImproveBadge item={r} /></h5>
            <ul>{r.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
            <ImprovePanel item={r} improveConcepts={data.improvementConcepts || {}} />
          </div>
        ))}
      </div>
      <div className="cobra-role-filters">
        <button
          type="button"
          className={`wb-filter${roleFilter === "all" ? " active" : ""}`}
          onClick={() => onRoleFilter("all")}
        >
          Show all steps
        </button>
        {entries.map(([key, r]) => (
          <button
            type="button"
            key={key}
            className={`wb-filter${roleFilter === key ? " active" : ""}`}
            onClick={() => onRoleFilter(key)}
          >
            {r.title} steps only
          </button>
        ))}
      </div>
    </div>
  );
}

function ImproveLensCard({ data, showImprove, onToggle }) {
  const concepts = data.improvementConcepts;
  if (!concepts) return null;
  const entries = Object.entries(concepts);
  return (
    <div className="improve-lens-card">
      <div className="improve-lens-head">
        <h4>Read this like a manager would</h4>
        <p className="cap">Every process has friction built into it — moving up means learning to see it, name it, and ask the right question about it. These are the patterns worth training your eye on, mapped onto the steps below where they actually show up.</p>
      </div>
      <div className="improve-glossary">
        {entries.map(([key, c]) => (
          <div className="improve-glossary-item" key={key}>
            <span className="improve-glossary-label">{c.label}</span>
            <p>{c.def}</p>
          </div>
        ))}
      </div>
      <button type="button" className={`improve-lens-toggle${showImprove ? " active" : ""}`} onClick={onToggle}>
        {showImprove ? "Hide process-improvement notes" : "Show process-improvement notes"}
      </button>
    </div>
  );
}

// data: the parsed cobra-process.json shape — { roles?, rolesNote?,
// improvementConcepts?, phases: [{ id, title, steps: [...] }] }.
export default function CobraProcess({ data }) {
  const [showImprove, setShowImprove] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

  if (!data) return null;
  const improveConcepts = data.improvementConcepts || {};

  return (
    <div className={showImprove ? "cflow-improve-on" : undefined}>
      <RolesCard data={data} roleFilter={roleFilter} onRoleFilter={setRoleFilter} />
      <ImproveLensCard data={data} showImprove={showImprove} onToggle={() => setShowImprove((v) => !v)} />
      <div className="cflow">
        {data.phases.map((phase, pi) => (
          <Fragment key={phase.id || pi}>
            <PhaseMarker phase={phase} index={pi} />
            <CobraSteps steps={phase.steps} improveConcepts={improveConcepts} roleFilter={roleFilter} />
            {pi < data.phases.length - 1 && <div className="cflow-connector" />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
