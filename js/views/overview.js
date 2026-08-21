function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function fmtDateLong(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function escBrief(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function renderOverview(mount) {
  mount.innerHTML = `
    <div class="aurora-page">
      <div class="aurora-glow aurora-glow-1"></div>
      <div class="aurora-glow aurora-glow-2"></div>
      <div class="aurora-grid"></div>

      <div class="aurora-content">
        <section class="aurora-hero">
          <div class="aurora-giant-num" aria-hidden="true">50</div>
          <div>
            <div class="aurora-eyebrow"><span class="rule"></span>${fmtDateLong(new Date())}</div>
            <h1>${timeGreeting()} — here's today's briefing.</h1>
            <p>Custodian reads the benefits administration industry straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure — refreshed automatically every day so this page is never the same one twice.</p>
            <div class="aurora-actions">
              <a class="aurora-cta" href="#briefGrid">Open the briefing ↓</a>
              <div class="aurora-stat"><b>50</b>years at Kelly Benefits</div>
            </div>
          </div>
        </section>

        <section class="aurora-dash">
          <div class="aurora-eyebrow"><span class="rule"></span>Live — 3 entries</div>
          <div class="aurora-grid-3" id="briefGrid">
            <div class="aurora-card"><div class="loading">Loading…</div></div>
            <div class="aurora-card"><div class="loading">Loading…</div></div>
            <div class="aurora-card"><div class="loading">Loading…</div></div>
          </div>
        </section>

        <section class="aurora-sections">
          <div class="aurora-eyebrow"><span class="rule"></span>Explore</div>
          <div class="aurora-grid-4">
            <a class="aurora-tile" href="#/insights"><span class="arrow">→</span><span class="t">Insights</span><span class="d">Regulatory tracking &amp; trends</span></a>
            <a class="aurora-tile" href="#/landscape"><span class="arrow">→</span><span class="t">Landscape</span><span class="d">Who the players are</span></a>
            <a class="aurora-tile" href="#/hologram"><span class="arrow">→</span><span class="t">Hologram</span><span class="d">The live, interactive org structure</span></a>
            <a class="aurora-tile" href="study/"><span class="arrow">↗</span><span class="t">Exam Prep</span><span class="d">Study reference</span></a>
          </div>
        </section>
      </div>
    </div>
  `;

  const grid = document.getElementById("briefGrid");

  const [insightsResult, landscapeResult, fitResult] = await Promise.allSettled([
    fetch("data/insights.json").then(r => r.json()),
    fetch("data/landscape.json").then(r => r.json()),
    supabaseClient.from("site_text").select("content").eq("key", "fit").maybeSingle()
  ]);

  if (!document.getElementById("briefGrid")) return;

  const cards = [];

  if (insightsResult.status === "fulfilled") {
    const insights = insightsResult.value;
    const latest = [...insights].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latest) {
      const CAT_LABEL = { reg: "Regulatory", trend: "Industry trend", tip: "Practical tip" };
      cards.push(`
        <a class="aurora-card" href="#/insights">
          <span class="tag">Latest Insight · ${CAT_LABEL[latest.cat] || "Update"}</span>
          <h3>${latest.title}</h3>
          <p>${latest.body}</p>
          <div class="foot mono">${latest.date}</div>
        </a>
      `);
    }
  } else {
    cards.push(`<div class="aurora-card"><span class="tag">Latest Insight</span><p style="color:var(--warn);">Couldn't load Insights data.</p></div>`);
  }

  if (landscapeResult.status === "fulfilled") {
    const deals = landscapeResult.value.mnaDeals || [];
    const latest = [...deals].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latest) {
      cards.push(`
        <a class="aurora-card" href="#/landscape">
          <span class="tag">Latest Landscape Move</span>
          <h3>${latest.deal}</h3>
          <p>${latest.sig}</p>
          <div class="foot mono">${latest.date}${latest.value ? " · " + latest.value : ""}</div>
        </a>
      `);
    }
  } else {
    cards.push(`<div class="aurora-card"><span class="tag">Latest Landscape Move</span><p style="color:var(--warn);">Couldn't load Landscape data.</p></div>`);
  }

  const fitContent = fitResult.status === "fulfilled" && fitResult.value.data ? fitResult.value.data.content : "";
  if (fitContent && fitContent.trim()) {
    cards.push(`
      <a class="aurora-card" href="#/company">
        <span class="tag">Where You Fit</span>
        <h3>Your seat, in your own words</h3>
        <p>${escBrief(fitContent)}</p>
        <div class="foot">Edit on the Company page →</div>
      </a>
    `);
  } else {
    cards.push(`
      <a class="aurora-card" href="#/company">
        <span class="tag">Where You Fit</span>
        <h3>Ground this in your actual seat</h3>
        <p>Everything else on this page is industry-wide. Add a line on the Company page about where you actually sit.</p>
        <div class="foot">Set it on the Company page →</div>
      </a>
    `);
  }

  grid.innerHTML = cards.join("");
}
Router.register("overview", renderOverview);
