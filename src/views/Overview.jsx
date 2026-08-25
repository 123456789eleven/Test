import { useEffect, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";

const CAT_LABEL = { reg: "Regulatory", trend: "Industry trend", tip: "Practical tip" };

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function fmtDateLong(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function BriefCard({ children, href }) {
  return <a className="aurora-card" href={href}>{children}</a>;
}

export default function Overview() {
  const [cards, setCards] = useState(null); // null = loading

  useEffect(() => {
    let active = true;
    const dataUrl = (name) => `${import.meta.env.BASE_URL}data/${name}`;
    Promise.allSettled([
      fetch(dataUrl("insights.json")).then((r) => r.json()),
      fetch(dataUrl("landscape.json")).then((r) => r.json()),
      supabaseClient.from("site_text").select("content").eq("key", "fit").maybeSingle(),
    ]).then(([insightsResult, landscapeResult, fitResult]) => {
      if (!active) return;

      const built = [];

      if (insightsResult.status === "fulfilled") {
        const latest = [...insightsResult.value].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latest) {
          built.push(
            <BriefCard key="insights" href="#/insights">
              <span className="tag">Latest Insight · {CAT_LABEL[latest.cat] || "Update"}</span>
              <h3>{latest.title}</h3>
              <p>{latest.body}</p>
              <div className="foot mono">{latest.date}</div>
            </BriefCard>
          );
        }
      } else {
        built.push(
          <div className="aurora-card" key="insights-err">
            <span className="tag">Latest Insight</span>
            <p style={{ color: "var(--warn)" }}>Couldn't load Insights data.</p>
          </div>
        );
      }

      if (landscapeResult.status === "fulfilled") {
        const deals = landscapeResult.value.mnaDeals || [];
        const latest = [...deals].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latest) {
          built.push(
            <BriefCard key="landscape" href="#/landscape">
              <span className="tag">Latest Landscape Move</span>
              <h3>{latest.deal}</h3>
              <p>{latest.sig}</p>
              <div className="foot mono">{latest.date}{latest.value ? ` · ${latest.value}` : ""}</div>
            </BriefCard>
          );
        }
      } else {
        built.push(
          <div className="aurora-card" key="landscape-err">
            <span className="tag">Latest Landscape Move</span>
            <p style={{ color: "var(--warn)" }}>Couldn't load Landscape data.</p>
          </div>
        );
      }

      const fitContent = fitResult.status === "fulfilled" && fitResult.value.data ? fitResult.value.data.content : "";
      built.push(
        fitContent && fitContent.trim() ? (
          <BriefCard key="fit" href="#/company">
            <span className="tag">Where You Fit</span>
            <h3>Your seat, in your own words</h3>
            <p>{fitContent}</p>
            <div className="foot">Edit on the Company page →</div>
          </BriefCard>
        ) : (
          <BriefCard key="fit" href="#/company">
            <span className="tag">Where You Fit</span>
            <h3>Ground this in your actual seat</h3>
            <p>Everything else on this page is industry-wide. Add a line on the Company page about where you actually sit.</p>
            <div className="foot">Set it on the Company page →</div>
          </BriefCard>
        )
      );

      setCards(built);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="aurora-page">
      <div className="aurora-glow aurora-glow-1" />
      <div className="aurora-glow aurora-glow-2" />
      <div className="aurora-grid" />

      <div className="aurora-content">
        <section className="aurora-hero">
          <div className="aurora-giant-num" aria-hidden="true">50</div>
          <div>
            <div className="aurora-eyebrow"><span className="rule" />{fmtDateLong(new Date())}</div>
            <h1>{timeGreeting()} — here's today's briefing.</h1>
            <p>Custodian reads the benefits administration industry straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure — refreshed automatically every day so this page is never the same one twice.</p>
            <div className="aurora-actions">
              <a className="aurora-cta" href="#briefGrid">Open the briefing ↓</a>
              <div className="aurora-stat"><b>50</b>years at Kelly Benefits</div>
            </div>
          </div>
        </section>

        <section className="aurora-dash">
          <div className="aurora-eyebrow"><span className="rule" />Live — 3 entries</div>
          <div className="aurora-grid-3" id="briefGrid">
            {cards || [0, 1, 2].map((i) => <div className="aurora-card" key={i}><div className="loading">Loading…</div></div>)}
          </div>
        </section>

        <section className="aurora-sections">
          <div className="aurora-eyebrow"><span className="rule" />Explore</div>
          <div className="aurora-grid-4">
            <a className="aurora-tile" href="#/insights"><span className="arrow">→</span><span className="t">Insights</span><span className="d">Regulatory tracking &amp; trends</span></a>
            <a className="aurora-tile" href="#/landscape"><span className="arrow">→</span><span className="t">Landscape</span><span className="d">Who the players are</span></a>
            <a className="aurora-tile" href="#/hologram"><span className="arrow">→</span><span className="t">Hologram</span><span className="d">The live, interactive org structure</span></a>
            <a className="aurora-tile" href="study/"><span className="arrow">↗</span><span className="t">Exam Prep</span><span className="d">Study reference</span></a>
          </div>
        </section>
      </div>
    </div>
  );
}
