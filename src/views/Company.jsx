import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useSearchRegister } from "../hooks/useSearchRegister";
import SignInModal from "../components/shell/SignInModal";
import Callout from "../components/Callout";
import DivisionFlow from "../components/DivisionFlow";
import CobraProcess from "../components/CobraProcess";

const dataUrl = (name) => `${import.meta.env.BASE_URL}data/${name}`;

const HERO_COVERED = ["Founded", "Scale", "Recognition"];
const SWOT_ORDER = [
  ["strengths", "Strengths"],
  ["weaknesses", "Weaknesses"],
  ["opportunities", "Opportunities"],
  ["threats", "Threats"],
];

// Same "each page owns its data query" convention as the other views — only
// what this page actually needs (divisions for the flow-edge name lookup,
// leadership for the roster), not the full org structure Hologram loads.
async function loadCompanyOrgData() {
  const [divR, peopleR] = await Promise.all([
    supabaseClient.from("org_divisions").select("*").order("sort_order"),
    supabaseClient.from("org_people").select("*").order("sort_order"),
  ]);
  for (const r of [divR, peopleR]) if (r.error) throw r.error;
  return {
    divisions: divR.data,
    leadership: peopleR.data.map((p) => ({
      id: p.id, name: p.name, title: p.title, note: p.note, parent: p.parent, cross: p.cross_divisions,
    })),
  };
}

// The "Where I Fit" box — live, auth-gated, editable. Auth state comes
// straight from useAuth(); no manual authchange listener or DOM class
// toggling needed, React just re-renders when isSignedIn flips.
function FitBox() {
  const { isSignedIn } = useAuth();
  const [value, setValue] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    let active = true;
    supabaseClient.from("site_text").select("content").eq("key", "fit").maybeSingle().then(({ data }) => {
      if (!active) return;
      setValue((data && data.content) || "");
    });
    return () => { active = false; };
  }, []);

  function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    if (!isSignedIn) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      supabaseClient.from("site_text").upsert({ key: "fit", content: next });
    }, 700);
  }

  return (
    <div className="fit-box">
      <div className="lbl">Where I fit</div>
      <textarea
        placeholder="e.g. I work in COBRA administration within Kelly Benefits Advantage, handling..."
        value={value}
        readOnly={!isSignedIn}
        onChange={handleChange}
      />
      <div className="hint">
        {isSignedIn ? (
          `Ground the rest of this page in your actual seat — it changes what "moving up" should mean.`
        ) : (
          <>
            Sign in to edit.{" "}
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--accent)", textDecoration: "underline", cursor: "pointer", font: "inherit", padding: 0 }}
              onClick={() => setShowSignIn(true)}
            >
              Sign in
            </button>
          </>
        )}
      </div>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}

export default function Company() {
  const [staticData, setStaticData] = useState(null);
  const [staticError, setStaticError] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [cobraData, setCobraData] = useState(null);
  const [cobraError, setCobraError] = useState(null);
  const [flowDetail, setFlowDetail] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetch(dataUrl("company.json")).then((r) => r.json()),
      loadCompanyOrgData(),
    ]).then(([staticResult, orgResult]) => {
      if (!active) return;
      if (staticResult.status !== "fulfilled") {
        setStaticError(staticResult.reason && staticResult.reason.message ? staticResult.reason.message : String(staticResult.reason));
        return;
      }
      setStaticData(staticResult.value);
      if (orgResult.status === "fulfilled") {
        setOrgData(orgResult.value);
      } else {
        console.error("Live org data unavailable, showing last saved structure:", orgResult.reason);
        setOrgData({ divisions: staticResult.value.divisions, leadership: staticResult.value.leadership });
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(dataUrl("cobra-process.json")).then((r) => r.json()).then((json) => {
      if (active) setCobraData(json);
    }).catch((err) => {
      if (active) setCobraError(err.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === wrapRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const company = useMemo(() => {
    if (!staticData) return null;
    return { ...staticData, ...orgData };
  }, [staticData, orgData]);

  const searchEntries = useMemo(
    () => (company ? company.leadership.map((p) => ({ title: p.name, snippet: p.title, route: "company" })) : []),
    [company]
  );
  useSearchRegister("Company", searchEntries);

  function handleFlowEdgeClick(edge) {
    const fromName = (company.divisions.find((d) => d.id === edge.from) || {}).name || edge.from;
    const toName = (company.divisions.find((d) => d.id === edge.to) || {}).name || edge.to;
    setFlowDetail({ fromName, toName, label: edge.label, detail: edge.detail });
  }

  function toggleFullscreen() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (!document.fullscreenElement) {
      wrap.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <>
      <div className="kb-hero">
        <div className="kb-hero-content">
          <h1>Kelly Benefits — Company</h1>
          <p>
            The narrative behind the structure — where the company came from, how the four divisions read strategically, and how a client relationship actually flows between them. For the live, interactive org structure itself, see{" "}
            <a href="#/hologram" style={{ color: "#fff", textDecoration: "underline" }}>the Hologram</a>.
          </p>
        </div>
        <div className="kb-hero-stats">
          <div className="kb-stat"><div className="kb-stat-big">50</div><div className="kb-stat-label">Years since founding — 50th anniversary this year</div></div>
          <div className="kb-stat"><div className="kb-stat-big">10K+</div><div className="kb-stat-label">Corporate clients, 600,000+ covered lives</div></div>
          <div className="kb-stat"><div className="kb-stat-big">23</div><div className="kb-stat-label">Years ranked #1 in Maryland (2002–2024)</div></div>
        </div>
      </div>

      <FitBox />

      {staticError && <p className="loading">Couldn't load Kelly Benefits data ({staticError}).</p>}
      {!staticError && !company && <p className="loading">Loading…</p>}

      {company && (
        <>
          <div className="snapshot">
            {company.snapshot.filter((s) => !HERO_COVERED.includes(s.l)).map((s) => (
              <div className="snap-card" key={s.l}>
                <div className="l">{s.l}</div>
                <div className="v">{s.v}</div>
              </div>
            ))}
          </div>

          <Callout className="integration-box">
            <b>{company.integrationNote.split(" — ")[0]} —</b> {company.integrationNote.split(" — ").slice(1).join(" — ")}
          </Callout>

          <p className="section-label" style={{ marginTop: "2rem" }}>How the work actually moves — through the divisions, then through the COBRA process itself</p>

          <div className="workflow-card">
            <h3>How the client relationship actually flows</h3>
            <p className="cap">A different lens on the same circle — the direction work and data actually move as a single client relationship travels through all four divisions, on repeat, for as long as they stay a client. Click any division or arrow for detail.</p>
            <DivisionFlow companyData={company} onEdgeClick={handleFlowEdgeClick} />
            {flowDetail && (
              <div className="flow-detail show">
                <b>{flowDetail.fromName} → {flowDetail.toName}: {flowDetail.label}.</b> {flowDetail.detail}
              </div>
            )}
            {company.divisionFlowNote && <p className="chart-caption" style={{ marginTop: 14 }}>{company.divisionFlowNote}</p>}
          </div>

          <div className="cobra-wrap" ref={wrapRef}>
            <div className="cobra-head">
              <div>
                <h3>The real COBRA administration process, start to finish</h3>
                <p className="cobra-source">
                  {cobraError
                    ? `Couldn't load the COBRA process data (${cobraError}).`
                    : cobraData
                    ? cobraData.intro
                    : "Loading…"}
                </p>
              </div>
              <button type="button" className="orgmap-fs-btn" onClick={toggleFullscreen}>
                {isFullscreen ? "✕ Exit fullscreen" : "⛶ Fullscreen"}
              </button>
            </div>
            {cobraData && <CobraProcess data={cobraData} />}
          </div>

          <Callout heading='Where "enrollment" and "reconciliation" actually sit' className="crosscutting-box">
            <p><b>Enrollment</b> {company.crossCutting.enrollment.replace(/^Enrollment\s*/, "")}</p>
            <p><b>Reconciliation</b> {company.crossCutting.reconciliation.replace(/^Reconciliation\s*/, "")}</p>
          </Callout>

          <p className="section-label" style={{ marginTop: "2rem" }}>Strategic read</p>

          <div className="swot-card">
            <h3>SWOT</h3>
            <p className="cap">The circle and the competitor data, synthesized into a strategic read — not a description of what Kelly is, but a read on the position it's actually in.</p>
            <div className="swot-grid">
              {SWOT_ORDER.map(([key, label]) => (
                <div className={`swot-item ${key}`} key={key}>
                  <h4>{label}</h4>
                  <ul>{company.swot[key].map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>

          <p className="section-label" style={{ marginTop: "2rem" }}>Leadership — split across the four divisions</p>
          <div className="leadership">
            {company.leadership.map((p) => (
              <div className="leader-card" key={p.id}>
                <div className="name">{p.name}</div>
                <div className="title">{p.title}</div>
                <div className="note">{p.note}</div>
              </div>
            ))}
          </div>

          <div className="timeline-card">
            <h3>Company history</h3>
            <p className="cap">50 years from a bedroom in Maryland to four connected divisions — the growth pattern (family stability, then acquisition, then outside technology leadership) tells its own story.</p>
            <div className="timeline">
              {company.history.map((h, i) => (
                <div className="tl-item" key={i}>
                  <div className="tl-date mono">{h.date}</div>
                  <div className="tl-deal">
                    {h.deal}
                    {h.value && (
                      <span className="mono" style={{ fontWeight: 400, color: "var(--ink-muted)", fontSize: "0.8rem" }}> — {h.value}</span>
                    )}
                  </div>
                  <div className="tl-sig">{h.sig}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
