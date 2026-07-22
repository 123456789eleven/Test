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
    <div class="kb-hero">
      <div class="kb-hero-content">
        <h1>${timeGreeting()} — here's today's briefing</h1>
        <p>${fmtDateLong(new Date())}. Custodian reads the benefits administration industry straight — regulatory tracking, competitive landscape, and Kelly Benefits' own structure, refreshed automatically every day so this page is never the same one twice.</p>
      </div>
    </div>

    <div class="brief-grid" id="briefGrid">
      <div class="brief-card"><div class="loading">Loading…</div></div>
      <div class="brief-card"><div class="loading">Loading…</div></div>
      <div class="brief-card"><div class="loading">Loading…</div></div>
    </div>

    <div class="brief-tiles">
      <a class="brief-tile bt-insights" href="#/insights"><div class="bt-eyebrow">Industry Insights</div><div class="bt-label">Regulatory tracking &amp; trends</div><span class="bt-arrow">→</span></a>
      <a class="brief-tile bt-landscape" href="#/landscape"><div class="bt-eyebrow">Landscape</div><div class="bt-label">Who the players are</div><span class="bt-arrow">→</span></a>
      <a class="brief-tile bt-kelly" href="#/company"><div class="bt-eyebrow">Kelly Benefits</div><div class="bt-label">Structure, connections &amp; process</div><span class="bt-arrow">→</span></a>
      <a class="brief-tile bt-exam" href="study/"><div class="bt-eyebrow">Exam Prep</div><div class="bt-label">Study reference</div><span class="bt-arrow">↗</span></a>
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
        <a class="brief-card" href="#/insights">
          <div class="brief-eyebrow">Latest Insight · ${CAT_LABEL[latest.cat] || "Update"}</div>
          <h3>${latest.title}</h3>
          <p>${latest.body}</p>
          <div class="brief-date mono">${latest.date}</div>
        </a>
      `);
    }
  } else {
    cards.push(`<div class="brief-card"><div class="brief-eyebrow">Latest Insight</div><p style="color:var(--warn);">Couldn't load Insights data.</p></div>`);
  }

  if (landscapeResult.status === "fulfilled") {
    const deals = landscapeResult.value.mnaDeals || [];
    const latest = [...deals].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latest) {
      cards.push(`
        <a class="brief-card" href="#/landscape">
          <div class="brief-eyebrow">Latest Landscape Move</div>
          <h3>${latest.deal}</h3>
          <p>${latest.sig}</p>
          <div class="brief-date mono">${latest.date}${latest.value ? " · " + latest.value : ""}</div>
        </a>
      `);
    }
  } else {
    cards.push(`<div class="brief-card"><div class="brief-eyebrow">Latest Landscape Move</div><p style="color:var(--warn);">Couldn't load Landscape data.</p></div>`);
  }

  const fitContent = fitResult.status === "fulfilled" && fitResult.value.data ? fitResult.value.data.content : "";
  if (fitContent && fitContent.trim()) {
    cards.push(`
      <a class="brief-card" href="#/company">
        <div class="brief-eyebrow">Where You Fit</div>
        <h3>Your seat, in your own words</h3>
        <p>${escBrief(fitContent)}</p>
        <div class="brief-date">Edit on the Kelly Benefits page →</div>
      </a>
    `);
  } else {
    cards.push(`
      <a class="brief-card" href="#/company">
        <div class="brief-eyebrow">Where You Fit</div>
        <h3>Ground this in your actual seat</h3>
        <p>Everything else on this page is industry-wide. Add a line on the Kelly Benefits page about where you actually sit, and it'll show up here instead of this prompt.</p>
        <div class="brief-date">Set it on the Kelly Benefits page →</div>
      </a>
    `);
  }

  grid.innerHTML = cards.join("");
}
Router.register("overview", renderOverview);
