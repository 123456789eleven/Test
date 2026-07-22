async function renderInsightsView(mount) {
  mount.innerHTML = `
    <div class="kb-hero">
      <div class="kb-hero-content">
        <h1>Industry Insights</h1>
        <p>Regulatory changes, TPA industry trends, and practical tips — with the underlying data, not just the headline.</p>
      </div>
      <div class="kb-hero-stats">
        <div class="kb-stat"><div class="kb-stat-big" id="heroInsightCount">—</div><div class="kb-stat-label">Insights tracked, refreshed daily</div></div>
        <div class="kb-stat"><div class="kb-stat-big">$845B</div><div class="kb-stat-label">Projected TPA/claims-admin market size by 2031 (~7.4% CAGR)</div></div>
        <div class="kb-stat"><div class="kb-stat-big">$500K</div><div class="kb-stat-label">Max annual compliance exposure cap per client</div></div>
      </div>
    </div>
    <div class="refresh-badge"><span class="pulse"></span><span id="lastUpdated">Last updated —</span></div>

    <div class="live-card">
      <h3><span class="live-dot"></span>Live sources</h3>
      <p class="cap">The feed below is curated and refreshes daily (automated, filtered for genuine relevance). For anything more current than that, these are the actual live pages — no delay, no filtering.</p>
      <div class="live-links">
        <a href="https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/newsroom" target="_blank" rel="noopener">DOL EBSA Newsroom</a>
        <a href="https://www.irs.gov/newsroom" target="_blank" rel="noopener">IRS Newsroom</a>
        <a href="https://insurance.maryland.gov/Insurer/Pages/Bulletins.aspx" target="_blank" rel="noopener">Maryland Insurance Administration Bulletins</a>
        <a href="https://www.benefitnews.com" target="_blank" rel="noopener">Employee Benefit News</a>
      </div>
    </div>

    <div class="charts">
      <div class="chart-card">
        <h3>Continuation coverage duration by jurisdiction</h3>
        <p class="cap">A case's jurisdiction alone can be the difference between three months of coverage and three years. Getting the funding/headcount classification right at intake isn't paperwork — it decides the entire outcome for the beneficiary.</p>
        <div class="viz" id="chartDuration"></div>
      </div>
      <div class="chart-card">
        <h3>Per-day penalty exposure</h3>
        <p class="cap">Family-level exposure runs highest per day — but the real risk is procedural: penalties compound daily and retroactively once a gap is found, which is why a clean audit trail is treated as a deliverable, not a formality.</p>
        <div class="viz" id="chartPenalty"></div>
      </div>
      <div class="chart-card wide">
        <h3>TPA / claims-administration market size, 2026–2031</h3>
        <p class="cap">A market growing near 7.4% a year is consolidating at the same time. 2026 and 2031 figures are reported estimates; interim years are interpolated at the reported CAGR, not independently sourced per year.</p>
        <div class="viz" id="chartMarket"></div>
      </div>
      <div class="chart-card wide">
        <h3>What a compliance failure actually costs</h3>
        <p class="cap">These aren't a single scale — a per-day rate, a flat audit minimum, and an annual cap measure different things — so they're shown as what they are rather than forced onto one misleading axis.</p>
        <div class="kpis">
          <div class="kpi"><div class="l">IRS audit minimum</div><div class="v mono">$2,500</div><div class="d">per beneficiary, if uncorrected</div></div>
          <div class="kpi"><div class="l">"More than trivial" violation</div><div class="v mono">$15,000</div><div class="d">per violation, once escalated</div></div>
          <div class="kpi"><div class="l">Annual cap</div><div class="v mono">Lesser of $500K / 10%</div><div class="d">of prior-year health plan costs</div></div>
        </div>
      </div>
    </div>

    <div class="cat-filters" id="catFilters">
      <button class="cat-chip active" data-cat="all">All</button>
      <button class="cat-chip" data-cat="reg">Regulatory</button>
      <button class="cat-chip" data-cat="trend">Industry trends</button>
      <button class="cat-chip" data-cat="tip">Practical tips</button>
    </div>
    <div class="feed" id="insightsFeed"></div>
  `;

  renderDurationChart();
  renderPenaltyChart();
  renderMarketChart();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll(".hbar-fill[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
  }));

  let insights = [];
  try {
    const res = await fetch("data/insights.json");
    insights = await res.json();
  } catch (err) {
    document.getElementById("insightsFeed").innerHTML = `<div style="color:var(--warn);">Couldn't load Insights data (${err.message}).</div>`;
    return;
  }

  document.getElementById("heroInsightCount").textContent = insights.length;

  const CAT_LABEL = { reg: "Regulatory", trend: "Industry trend", tip: "Practical tip" };
  function renderFeed(filter) {
    const sorted = [...insights].sort((a, b) => new Date(b.date) - new Date(a.date));
    const filtered = filter === "all" ? sorted : sorted.filter(i => i.cat === filter);
    document.getElementById("insightsFeed").innerHTML = filtered.map(i => `
      <div class="entry">
        <div class="meta"><span class="tag">${CAT_LABEL[i.cat]}</span><span class="date">${i.date}</span></div>
        <h3>${i.title}</h3>
        <p>${i.body}</p>
        ${i.sources.length ? `<div class="srcs">${i.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.title} ↗</a>`).join("")}</div>` : ""}
      </div>
    `).join("");
    const latest = sorted[0];
    if (latest) document.getElementById("lastUpdated").textContent = `Last updated — ${latest.date}`;
  }
  document.getElementById("catFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    document.querySelectorAll("#catFilters .cat-chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderFeed(btn.dataset.cat);
  });
  renderFeed("all");

  SearchIndex.register("Insights", insights.map(i => ({ title: i.title, snippet: i.body, route: "insights" })));
}

function renderDurationChart() {
  const data = [
    { label: "Federal", value: 18, note: "up to 36 mo. (2nd event) / 29 mo. (disability)" },
    { label: "Maryland", value: 18, note: "up to 29 mo. (disability)" },
    { label: "Virginia", value: 12, note: "flat 12 months" },
    { label: "D.C.", value: 3, note: "shortest of the four" }
  ];
  const max = 20;
  const el = document.getElementById("chartDuration");
  el.innerHTML = data.map(d => `
    <div class="hbar-row">
      <div class="lbl">${d.label}</div>
      <div class="hbar-track"><div class="hbar-fill" data-w="${(d.value / max) * 100}"></div></div>
      <div class="val mono">${d.value} mo.</div>
    </div>
  `).join("") + `
    <div class="axis-ticks"><div></div><div class="ticks"><span>0</span><span>6</span><span>12</span><span>18</span></div><div></div></div>
    <details class="table-toggle"><summary>View as table</summary>
      <table><thead><tr><th>Jurisdiction</th><th>Standard duration</th><th>Notes</th></tr></thead>
      <tbody>${data.map(d => `<tr><td>${d.label}</td><td>${d.value} months</td><td>${d.note}</td></tr>`).join("")}</tbody></table>
    </details>`;
}

function renderPenaltyChart() {
  const data = [
    { label: "IRS excise (family)", value: 200 },
    { label: "DOL (per participant)", value: 110 },
    { label: "IRS excise (individual)", value: 100 }
  ];
  const max = 220;
  const el = document.getElementById("chartPenalty");
  el.innerHTML = data.map(d => `
    <div class="hbar-row">
      <div class="lbl">${d.label}</div>
      <div class="hbar-track"><div class="hbar-fill" data-w="${(d.value / max) * 100}"></div></div>
      <div class="val mono">$${d.value}/day</div>
    </div>
  `).join("") + `
    <div class="axis-ticks"><div></div><div class="ticks"><span>$0</span><span>$50</span><span>$100</span><span>$150</span><span>$200</span></div><div></div></div>
    <details class="table-toggle"><summary>View as table</summary>
      <table><thead><tr><th>Source</th><th>Rate</th></tr></thead>
      <tbody>${data.map(d => `<tr><td>${d.label}</td><td>$${d.value}/day</td></tr>`).join("")}</tbody></table>
    </details>`;
}

function renderMarketChart() {
  const years = [2026, 2027, 2028, 2029, 2030, 2031];
  const values = [592.5, 636.3, 683.3, 733.7, 788.0, 845.3];
  const w = 900, h = 200, padL = 46, padR = 30, padT = 20, padB = 26;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const minV = 550, maxV = 870;
  const x = i => padL + (i / (years.length - 1)) * innerW;
  const y = v => padT + innerH - ((v - minV) / (maxV - minV)) * innerH;
  const points = values.map((v, i) => [x(i), y(v)]);
  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const areaPath = linePath + ` L${x(years.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
  const gridVals = [600, 700, 800];
  const gridlines = gridVals.map(v => `<line class="gridline" x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}"/><text x="${padL - 8}" y="${y(v) + 3}" text-anchor="end">$${v}B</text>`).join("");
  const yearLabels = years.map((yr, i) => `<text x="${x(i)}" y="${h - 4}" text-anchor="middle">${yr}</text>`).join("");
  const dots = points.map((p, i) => `<circle class="dot" id="marketDot${i}" cx="${p[0]}" cy="${p[1]}" r="4"/>`).join("");
  const hits = points.map((p, i) => `<circle class="hit" cx="${p[0]}" cy="${p[1]}" r="14" fill="transparent" data-i="${i}" data-year="${years[i]}" data-value="${values[i]}"/>`).join("");
  const el = document.getElementById("chartMarket");
  el.innerHTML = `
    <svg class="linechart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      ${gridlines}
      <line class="baseline" x1="${padL}" x2="${w - padR}" y1="${padT + innerH}" y2="${padT + innerH}"/>
      <path class="area" d="${areaPath}"/>
      <path class="line" d="${linePath}"/>
      ${dots}
      <text class="endlabel" x="${x(0)}" y="${y(values[0]) - 12}" text-anchor="start">$${values[0]}B</text>
      <text class="endlabel" x="${x(values.length - 1)}" y="${y(values[values.length - 1]) - 12}" text-anchor="end">$${values[values.length - 1]}B</text>
      ${yearLabels}
      ${hits}
      <g id="marketTip" style="opacity:0; transition: opacity .12s ease; pointer-events:none;">
        <rect id="marketTipRect" rx="5" fill="var(--surface)" stroke="var(--border)" stroke-width="1" height="34"/>
        <text id="marketTipText" x="0" y="0" text-anchor="middle" style="font-size:11px; font-weight:700; fill:var(--ink);"></text>
      </g>
    </svg>
    <details class="table-toggle"><summary>View as table</summary>
      <table><thead><tr><th>Year</th><th>Market size</th></tr></thead>
      <tbody>${years.map((yr, i) => `<tr><td>${yr}</td><td>$${values[i]}B</td></tr>`).join("")}</tbody></table>
    </details>`;

  const tip = document.getElementById("marketTip");
  const tipRect = document.getElementById("marketTipRect");
  const tipText = document.getElementById("marketTipText");
  el.querySelectorAll(".hit").forEach(hit => {
    hit.addEventListener("mouseenter", () => {
      const i = hit.dataset.i;
      el.querySelectorAll(".linechart .dot").forEach(d => d.style.r = "4");
      const dot = document.getElementById("marketDot" + i);
      dot.style.r = "5.5";
      const cx = parseFloat(hit.getAttribute("cx")), cy = parseFloat(hit.getAttribute("cy"));
      tipText.textContent = `${hit.dataset.year}: $${hit.dataset.value}B`;
      const tw = Math.max(70, tipText.getComputedTextLength() + 20);
      tipRect.setAttribute("width", tw);
      tipRect.setAttribute("x", -tw / 2);
      tipRect.setAttribute("y", -34);
      tipText.setAttribute("x", 0);
      tipText.setAttribute("y", -14);
      tip.setAttribute("transform", `translate(${cx}, ${cy - 8})`);
      tip.style.opacity = "1";
    });
    hit.addEventListener("mouseleave", () => {
      tip.style.opacity = "0";
      const dot = document.getElementById("marketDot" + hit.dataset.i);
      if (dot) dot.style.r = "4";
    });
  });
}

Router.register("insights", renderInsightsView);
