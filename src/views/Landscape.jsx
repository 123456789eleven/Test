import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BarChart from "../components/charts/BarChart";
import SparklineChart from "../components/charts/SparklineChart";
import SignInModal from "../components/shell/SignInModal";
import { useAuth } from "../hooks/useAuth";
import { useSearchRegister } from "../hooks/useSearchRegister";
import { supabaseClient } from "../lib/supabaseClient";

const PAGE_ID = "landscape";
const TYPE_LABEL = { observation: "Observation", question: "Question", idea: "Idea" };
const FIELD_LABEL = { revenue: "Revenue", employees: "Employees" };
const LEVEL_LABEL = ["", "Low", "Moderate", "High"];
const TABS = [
  { id: "competitors", label: "Competitors" },
  { id: "consolidation", label: "Consolidation" },
  { id: "trends", label: "Trends" },
  { id: "strategy", label: "Strategy" },
  { id: "notes", label: "My Notes" },
];

function fmtM(v) {
  return v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${v}M`;
}

export default function Landscape() {
  const { isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState("competitors");

  const [companies, setCompanies] = useState(null); // null = loading
  const [mnaDeals, setMnaDeals] = useState(null);
  const [forces, setForces] = useState(null);
  const [dataError, setDataError] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    let active = true;
    const dataUrl = (name) => `${import.meta.env.BASE_URL}data/${name}`;

    fetch(dataUrl("landscape.json"))
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setCompanies(data.companies);
        setMnaDeals(data.mnaDeals);
        setForces(data.forces);
      })
      .catch((err) => {
        if (active) setDataError(err.message);
      });

    fetch(dataUrl("history.json"))
      .then((r) => r.json())
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((err) => {
        if (active) setHistoryError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const specialists = useMemo(() => (companies ? companies.filter((c) => c.name !== "ADP") : []), [companies]);

  useSearchRegister(
    "Landscape",
    companies && mnaDeals
      ? [
          ...companies.map((c) => ({ title: c.name, snippet: c.model, route: "landscape" })),
          ...mnaDeals.map((d) => ({ title: d.deal, snippet: d.sig, route: "landscape" })),
        ]
      : []
  );

  return (
    <div>
      <div className="kb-hero">
        <div className="kb-hero-content">
          <h1>Industry Landscape</h1>
          <p>
            Who the major players in benefits administration actually are, sized up by revenue, headcount, and business
            model — the competitive picture behind the regulatory detail on the Insights page.
          </p>
        </div>
        <div className="kb-hero-stats">
          <div className="kb-stat">
            <div className="kb-stat-big">$20.6B</div>
            <div className="kb-stat-label">ADP's FY2025 revenue — 3× the combined specialists below</div>
          </div>
          <div className="kb-stat">
            <div className="kb-stat-big">{mnaDeals ? mnaDeals.length : "—"}</div>
            <div className="kb-stat-label">M&amp;A deals tracked since 2023 — active consolidation</div>
          </div>
          <div className="kb-stat">
            <div className="kb-stat-big">{companies ? specialists.length : "—"}</div>
            <div className="kb-stat-label">Direct benefits-admin competitors profiled</div>
          </div>
        </div>
      </div>

      <div className="scale-note">
        <span className="big mono">$20.6B</span>
        <span className="rest">
          ADP's total FY2025 revenue — more than 3× the combined revenue of the four benefits-focused specialists below.
          ADP competes on scale as a diversified payroll/HR platform, not as a benefits specialist, which is why it's
          shown separately rather than squeezed onto the same bars.
        </span>
      </div>

      <div className="live-card">
        <h3>
          <span className="live-dot" />
          Live sources
        </h3>
        <p className="cap">
          The competitor figures and M&amp;A timeline below refresh daily (automated, only when something verified
          changes). For anything more current, these are the actual live pages.
        </p>
        <div className="live-links">
          <a href="https://www.businessinsurance.com" target="_blank" rel="noopener">
            Business Insurance
          </a>
          <a href="https://www.benefitnews.com" target="_blank" rel="noopener">
            Employee Benefit News
          </a>
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany" target="_blank" rel="noopener">
            SEC EDGAR Filings
          </a>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={activeTab === t.id ? "active" : ""} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* The Notes tab is Supabase-backed and independent of landscape.json, so it
          stays live even if that fetch fails — matching the old vanilla-JS view,
          where the notes CRUD was wired up before that fetch ever ran. Only the
          tabs that actually depend on companies/mnaDeals/forces show the error. */}
      {activeTab === "competitors" &&
        (dataError ? <DataError message={dataError} /> : <CompetitorsPanel companies={companies} specialists={specialists} />)}
      {activeTab === "consolidation" &&
        (dataError ? <DataError message={dataError} /> : <ConsolidationPanel mnaDeals={mnaDeals} />)}
      {activeTab === "trends" && <TrendsPanel history={history} historyError={historyError} />}
      {activeTab === "strategy" &&
        (dataError ? <DataError message={dataError} /> : <StrategyPanel forces={forces} />)}
      {activeTab === "notes" && <NotesPanel isSignedIn={isSignedIn} />}
    </div>
  );
}

function DataError({ message }) {
  return <div style={{ color: "var(--warn)" }}>Couldn't load Landscape data ({message}).</div>;
}

function CompetitorsPanel({ companies, specialists }) {
  if (!companies) return <div className="loading">Loading…</div>;

  const maxRev = Math.max(...specialists.map((c) => c.revenue));
  const maxEmp = Math.max(...specialists.map((c) => c.employees));
  const byRevenue = [...specialists].sort((a, b) => b.revenue - a.revenue);
  const byEmployees = [...specialists].sort((a, b) => b.employees - a.employees);
  const profileRows = [...companies].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="view active">
      <div className="charts">
        <div className="chart-card">
          <h3>Revenue — benefits specialists</h3>
          <p className="cap">
            Among firms that compete specifically on benefits and COBRA administration, WEX's payments-plus-benefits
            model edges out Alight's outsourcing scale.
          </p>
          <div>
            <BarChart
              data={byRevenue.map((c) => ({ label: c.name, value: c.revenue, display: fmtM(c.revenue) }))}
              max={maxRev}
              axisTicks={["$0", "$1B", "$2B", "$2.7B"]}
            />
          </div>
        </div>
        <div className="chart-card">
          <h3>Employees — benefits specialists</h3>
          <p className="cap">
            Headcount doesn't track revenue in a straight line — a hint at how much of each company's model is
            software-driven versus people-driven.
          </p>
          <div>
            <BarChart
              data={byEmployees.map((c) => ({ label: c.name, value: c.employees, display: c.employees.toLocaleString() }))}
              max={maxEmp}
              axisTicks={["0", "5,000", "10,000"]}
            />
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3>Company profiles</h3>
        <div className="table-wrap">
          <table className="profiles">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Business model</th>
                <th>Revenue</th>
                <th>Employees</th>
                <th>Revenue / employee</th>
              </tr>
            </thead>
            <tbody>
              {profileRows.map((c) => {
                const revPerEmp = Math.round((c.revenue * 1_000_000) / c.employees);
                return (
                  <tr key={c.name}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ color: "var(--ink-muted)", fontSize: "0.76rem" }}>{c.ticker}</div>
                    </td>
                    <td className="status">
                      <span className={`status-pill${c.status === "private" ? " private" : ""}`}>
                        {c.status === "public" ? "Public" : "Private"}
                      </span>
                    </td>
                    <td>
                      {c.model}
                      {c.note && <div style={{ color: "var(--ink-muted)", fontSize: "0.76rem", marginTop: 4 }}>{c.note}</div>}
                    </td>
                    <td className="mono">{fmtM(c.revenue)}</td>
                    <td className="mono">{c.employees.toLocaleString()}</td>
                    <td className="mono">${(revPerEmp / 1000).toFixed(0)}K</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="caveat">
          HealthEquity's FY2026 revenue mix is a tell for where this industry's money actually sits: of its $1.31B, more
          came from custodial interest on HSA balances ($636.8M) than from service fees ($485M) — administration is
          increasingly a wrapper around asset custody, not a pure fee-for-service business. Figures are the most recent
          publicly reported annual results as of this writing (public company filings; Businessolver's, Empyrean's, and
          TriNet's professional-service-revenue figures carry varying degrees of estimation, as noted above) and will
          drift out of date — treat this as a snapshot, not a live feed.
        </div>
      </div>
    </div>
  );
}

function ConsolidationPanel({ mnaDeals }) {
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  useEffect(() => {
    if (!mnaDeals) return undefined;
    if (reduceMotion) {
      setRevealed(true);
      return undefined;
    }
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [mnaDeals, reduceMotion]);

  if (!mnaDeals) return <div className="loading">Loading…</div>;

  return (
    <div className="view active">
      <div className="timeline-card">
        <h3>Consolidation timeline, 2023–2025</h3>
        <p className="cap">
          The market-growth chart on Insights and the "regional player among giants" framing on this page are both
          symptoms of the same thing: this industry is actively consolidating. These are real, dated deals — not a
          general trend statement.
        </p>
        <div className="timeline">
          {mnaDeals.map((d, i) => (
            <div
              className="tl-item"
              key={d.deal}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateX(0)" : "translateX(-6px)",
                transitionDelay: `${i * 0.06}s`,
              }}
            >
              <div className="tl-date mono">{d.date}</div>
              <div className="tl-deal">{d.deal}</div>
              <div className="tl-value mono">{d.value}</div>
              <div className="tl-sig">{d.sig}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendsPanel({ history, historyError }) {
  if (historyError) {
    return <div style={{ color: "var(--warn)" }}>Couldn't load trend history ({historyError}).</div>;
  }
  if (!history) return <div className="loading">Loading…</div>;

  const byCompany = {};
  const order = [];
  history.forEach((h) => {
    if (!byCompany[h.company]) {
      byCompany[h.company] = {};
      order.push(h.company);
    }
    byCompany[h.company][h.field] = byCompany[h.company][h.field] || [];
    byCompany[h.company][h.field].push(h);
  });

  return (
    <div className="view active">
      <div className="trends-intro">
        <p className="cap">
          Revenue and headcount are logged here only when the daily research check finds a genuinely new, sourced
          figure — never padded for density. Most companies will show a single baseline point until the next real
          update lands, then grow into a real trend line.
        </p>
      </div>
      <div className="trends-grid">
        {order.map((company) => {
          const fields = byCompany[company];
          const activeFields = ["revenue", "employees"].filter((f) => fields[f]);
          return (
            <div className="chart-card" key={company}>
              <h3>{company}</h3>
              {activeFields.map((f) => {
                const points = [...fields[f]].sort((a, b) => new Date(a.date) - new Date(b.date));
                const fmt = f === "revenue" ? fmtM : (v) => v.toLocaleString();
                return (
                  <div key={f}>
                    <div className="trend-field-label">{FIELD_LABEL[f]}</div>
                    {points.length === 1 ? (
                      <div className="trend-baseline">
                        Baseline {fmt(points[0].value)} <span className="trend-date mono">({points[0].date})</span>
                      </div>
                    ) : (
                      <div className="viz">
                        <SparklineChart points={points.map((p) => ({ x: p.date, y: p.value }))} formatValue={fmt} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyPanel({ forces }) {
  if (!forces) return <div className="loading">Loading…</div>;

  return (
    <div className="view active">
      <div className="forces-card">
        <h3>Industry forces</h3>
        <p className="cap">
          The data above, read as a strategic picture rather than a spec sheet — what's actually driving how this market
          behaves.
        </p>
        <div className="forces-grid">
          {forces.map((f) => (
            <div className="force-item" key={f.name}>
              <div className="fh">
                <h4>{f.name}</h4>
                <div className="force-level">
                  {LEVEL_LABEL[f.level]}{" "}
                  <span className="force-dots">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={n <= f.level ? "on" : ""} />
                    ))}
                  </span>
                </div>
              </div>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ isSignedIn }) {
  const [notes, setNotes] = useState(null); // null = loading
  const [notesError, setNotesError] = useState(null);
  const [noteType, setNoteType] = useState("observation");
  const [noteText, setNoteText] = useState("");
  const [noteRelated, setNoteRelated] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabaseClient
      .from("field_notes")
      .select("*")
      .eq("page", PAGE_ID)
      .order("created_at", { ascending: false });
    if (error) {
      setNotesError(error.message);
      return;
    }
    setNotesError(null);
    setNotes(data);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleAdd() {
    const text = noteText.trim();
    if (!text) return;
    setSubmitting(true);
    await supabaseClient.from("field_notes").insert({
      page: PAGE_ID,
      type: noteType,
      related: noteRelated.trim() || null,
      body: text,
    });
    setNoteText("");
    setNoteRelated("");
    setSubmitting(false);
    loadNotes();
  }

  async function handleDelete(id) {
    await supabaseClient.from("field_notes").delete().eq("id", id);
    loadNotes();
  }

  return (
    <div className="view active">
      <div className="notes-card">
        <h3>Field notes</h3>
        <p className="cap">
          Your own read on this market — observations, open questions, ideas worth chasing. Visible to anyone, editable
          only when you're signed in.
        </p>

        {!isSignedIn && (
          <div className="auth-gate">
            Sign in to add or edit notes.{" "}
            <button onClick={() => setShowSignIn(true)}>Sign in</button>
          </div>
        )}
        {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}

        {isSignedIn && (
          <div className="note-form">
            <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
              <option value="observation">Observation</option>
              <option value="question">Question</option>
              <option value="idea">Idea</option>
            </select>
            <textarea
              placeholder="What did you notice, wonder about, or want to test?"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="row2">
              <input
                placeholder="Related to (optional — e.g. a company name)"
                value={noteRelated}
                onChange={(e) => setNoteRelated(e.target.value)}
              />
              <button onClick={handleAdd} disabled={submitting}>
                Add note
              </button>
            </div>
          </div>
        )}

        <div className="notes-list">
          {notesError && <div style={{ color: "var(--warn)" }}>Couldn't load notes ({notesError}).</div>}
          {!notesError && notes && notes.length === 0 && (
            <div className="notes-empty">No notes yet — add your first observation above.</div>
          )}
          {!notesError &&
            notes &&
            notes.map((n) => (
              <div className="note-item" key={n.id}>
                {isSignedIn && (
                  <button className="note-del" title="Delete" onClick={() => handleDelete(n.id)}>
                    ✕
                  </button>
                )}
                <div className="nmeta">
                  <span className={`note-tag ${n.type}`}>{TYPE_LABEL[n.type]}</span>
                  {n.related && <span className="note-related">{n.related}</span>}
                  <span className="note-date mono">{n.created_at.slice(0, 10)}</span>
                </div>
                <div className="note-text">{n.body}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
