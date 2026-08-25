import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/charts/BarChart";
import SparklineChart from "../components/charts/SparklineChart";
import { useSearchRegister } from "../hooks/useSearchRegister";

const CAT_LABEL = { reg: "Regulatory", trend: "Industry trend", tip: "Practical tip" };
const CAT_FILTERS = [
  { cat: "all", label: "All" },
  { cat: "reg", label: "Regulatory" },
  { cat: "trend", label: "Industry trends" },
  { cat: "tip", label: "Practical tips" },
];

const DURATION_DATA = [
  { label: "Federal", value: 18, note: "up to 36 mo. (2nd event) / 29 mo. (disability)" },
  { label: "Maryland", value: 18, note: "up to 29 mo. (disability)" },
  { label: "Virginia", value: 12, note: "flat 12 months" },
  { label: "D.C.", value: 3, note: "shortest of the four" },
];

const PENALTY_DATA = [
  { label: "IRS excise (family)", value: 200 },
  { label: "DOL (per participant)", value: 110 },
  { label: "IRS excise (individual)", value: 100 },
];

const MARKET_YEARS = [2026, 2027, 2028, 2029, 2030, 2031];
const MARKET_VALUES = [592.5, 636.3, 683.3, 733.7, 788.0, 845.3];

export default function Insights() {
  const [insights, setInsights] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/insights.json`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setInsights(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(
    () => (insights ? [...insights].sort((a, b) => new Date(b.date) - new Date(a.date)) : []),
    [insights]
  );
  const filtered = activeCat === "all" ? sorted : sorted.filter((i) => i.cat === activeCat);
  const lastUpdated = sorted[0]?.date;

  useSearchRegister(
    "Insights",
    insights ? insights.map((i) => ({ title: i.title, snippet: i.body, route: "insights" })) : []
  );

  return (
    <div>
      <div className="kb-hero">
        <div className="kb-hero-content">
          <h1>Industry Insights</h1>
          <p>Regulatory changes, TPA industry trends, and practical tips — with the underlying data, not just the headline.</p>
        </div>
        <div className="kb-hero-stats">
          <div className="kb-stat">
            <div className="kb-stat-big">{insights ? insights.length : "—"}</div>
            <div className="kb-stat-label">Insights tracked, refreshed daily</div>
          </div>
          <div className="kb-stat">
            <div className="kb-stat-big">$845B</div>
            <div className="kb-stat-label">Projected TPA/claims-admin market size by 2031 (~7.4% CAGR)</div>
          </div>
          <div className="kb-stat">
            <div className="kb-stat-big">$500K</div>
            <div className="kb-stat-label">Max annual compliance exposure cap per client</div>
          </div>
        </div>
      </div>

      <div className="refresh-badge">
        <span className="pulse" />
        <span>{lastUpdated ? `Last updated — ${lastUpdated}` : "Last updated —"}</span>
      </div>

      <div className="live-card">
        <h3>
          <span className="live-dot" />
          Live sources
        </h3>
        <p className="cap">
          The feed below is curated and refreshes daily (automated, filtered for genuine relevance). For anything more
          current than that, these are the actual live pages — no delay, no filtering.
        </p>
        <div className="live-links">
          <a href="https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/newsroom" target="_blank" rel="noopener">
            DOL EBSA Newsroom
          </a>
          <a href="https://www.irs.gov/newsroom" target="_blank" rel="noopener">
            IRS Newsroom
          </a>
          <a href="https://insurance.maryland.gov/Insurer/Pages/Bulletins.aspx" target="_blank" rel="noopener">
            Maryland Insurance Administration Bulletins
          </a>
          <a href="https://www.benefitnews.com" target="_blank" rel="noopener">
            Employee Benefit News
          </a>
        </div>
      </div>

      <div className="charts">
        <div className="chart-card">
          <h3>Continuation coverage duration by jurisdiction</h3>
          <p className="cap">
            A case's jurisdiction alone can be the difference between three months of coverage and three years. Getting the
            funding/headcount classification right at intake isn't paperwork — it decides the entire outcome for the
            beneficiary.
          </p>
          <div className="viz">
            <BarChart
              data={DURATION_DATA.map((d) => ({ label: d.label, value: d.value, display: `${d.value} mo.` }))}
              max={20}
              axisTicks={["0", "6", "12", "18"]}
              table={{
                headers: ["Jurisdiction", "Standard duration", "Notes"],
                rows: DURATION_DATA.map((d) => [d.label, `${d.value} months`, d.note]),
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>Per-day penalty exposure</h3>
          <p className="cap">
            Family-level exposure runs highest per day — but the real risk is procedural: penalties compound daily and
            retroactively once a gap is found, which is why a clean audit trail is treated as a deliverable, not a
            formality.
          </p>
          <div className="viz">
            <BarChart
              data={PENALTY_DATA.map((d) => ({ label: d.label, value: d.value, display: `$${d.value}/day` }))}
              max={220}
              axisTicks={["$0", "$50", "$100", "$150", "$200"]}
              table={{
                headers: ["Source", "Rate"],
                rows: PENALTY_DATA.map((d) => [d.label, `$${d.value}/day`]),
              }}
            />
          </div>
        </div>

        <div className="chart-card wide">
          <h3>TPA / claims-administration market size, 2026–2031</h3>
          <p className="cap">
            A market growing near 7.4% a year is consolidating at the same time. 2026 and 2031 figures are reported
            estimates; interim years are interpolated at the reported CAGR, not independently sourced per year.
          </p>
          <div className="viz">
            <SparklineChart
              points={MARKET_YEARS.map((yr, i) => ({ x: yr, y: MARKET_VALUES[i] }))}
              formatValue={(v) => `$${v}B`}
              width={900}
              height={200}
              showGrid
              gridValues={[600, 700, 800]}
              showXLabels
              yDomain={[550, 870]}
              table={{
                headers: ["Year", "Market size"],
                rows: MARKET_YEARS.map((yr, i) => [yr, `$${MARKET_VALUES[i]}B`]),
              }}
            />
          </div>
        </div>

        <div className="chart-card wide">
          <h3>What a compliance failure actually costs</h3>
          <p className="cap">
            These aren't a single scale — a per-day rate, a flat audit minimum, and an annual cap measure different
            things — so they're shown as what they are rather than forced onto one misleading axis.
          </p>
          <div className="kpis">
            <div className="kpi">
              <div className="l">IRS audit minimum</div>
              <div className="v mono">$2,500</div>
              <div className="d">per beneficiary, if uncorrected</div>
            </div>
            <div className="kpi">
              <div className="l">"More than trivial" violation</div>
              <div className="v mono">$15,000</div>
              <div className="d">per violation, once escalated</div>
            </div>
            <div className="kpi">
              <div className="l">Annual cap</div>
              <div className="v mono">Lesser of $500K / 10%</div>
              <div className="d">of prior-year health plan costs</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cat-filters">
        {CAT_FILTERS.map(({ cat, label }) => (
          <button key={cat} className={`cat-chip${activeCat === cat ? " active" : ""}`} onClick={() => setActiveCat(cat)}>
            {label}
          </button>
        ))}
      </div>

      <div className="feed">
        {error ? (
          <div style={{ color: "var(--warn)" }}>Couldn't load Insights data ({error}).</div>
        ) : (
          filtered.map((i) => (
            <div className="entry" key={`${i.date}-${i.title}`}>
              <div className="meta">
                <span className="tag">{CAT_LABEL[i.cat]}</span>
                <span className="date">{i.date}</span>
              </div>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
              {i.sources.length > 0 && (
                <div className="srcs">
                  {i.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener">
                      {s.title} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
