(function () {
  const PAGE_ID = "landscape";
  const TYPE_LABEL = { observation: "Observation", question: "Question", idea: "Idea" };

  function fmtM(v) { return v >= 1000 ? "$" + (v / 1000).toFixed(2) + "B" : "$" + v + "M"; }

  async function renderLandscapeView(mount) {
    mount.innerHTML = `
      <div class="page-head">
        <h1>Industry Landscape</h1>
        <p>Who the major players in benefits administration actually are, sized up by revenue, headcount, and business model — the competitive picture behind the regulatory detail on the Insights page.</p>
      </div>

      <div class="scale-note">
        <span class="big mono">$20.6B</span>
        <span class="rest">ADP's total FY2025 revenue — more than 3× the combined revenue of the four benefits-focused specialists below. ADP competes on scale as a diversified payroll/HR platform, not as a benefits specialist, which is why it's shown separately rather than squeezed onto the same bars.</span>
      </div>

      <div class="live-card">
        <h3><span class="live-dot"></span>Live sources</h3>
        <p class="cap">The competitor figures and M&amp;A timeline below refresh daily (automated, only when something verified changes). For anything more current, these are the actual live pages.</p>
        <div class="live-links">
          <a href="https://www.businessinsurance.com" target="_blank" rel="noopener">Business Insurance</a>
          <a href="https://www.benefitnews.com" target="_blank" rel="noopener">Employee Benefit News</a>
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany" target="_blank" rel="noopener">SEC EDGAR Filings</a>
        </div>
      </div>

      <div class="tabs" id="lsTabs">
        <button data-view="competitors" class="active">Competitors</button>
        <button data-view="consolidation">Consolidation</button>
        <button data-view="trends">Trends</button>
        <button data-view="strategy">Strategy</button>
        <button data-view="notes">My Notes</button>
      </div>

      <div class="view active" id="lsview-competitors">
        <div class="charts">
          <div class="chart-card">
            <h3>Revenue — benefits specialists</h3>
            <p class="cap">Among firms that compete specifically on benefits and COBRA administration, WEX's payments-plus-benefits model edges out Alight's outsourcing scale.</p>
            <div id="lsChartRevenue"></div>
          </div>
          <div class="chart-card">
            <h3>Employees — benefits specialists</h3>
            <p class="cap">Headcount doesn't track revenue in a straight line — a hint at how much of each company's model is software-driven versus people-driven.</p>
            <div id="lsChartEmployees"></div>
          </div>
        </div>
        <div class="profile-card">
          <h3>Company profiles</h3>
          <div class="table-wrap" id="lsProfileTable"></div>
          <div class="caveat">HealthEquity's FY2026 revenue mix is a tell for where this industry's money actually sits: of its $1.31B, more came from custodial interest on HSA balances ($636.8M) than from service fees ($485M) — administration is increasingly a wrapper around asset custody, not a pure fee-for-service business. Figures are the most recent publicly reported annual results as of this writing (public company filings; Businessolver's, Empyrean's, and TriNet's professional-service-revenue figures carry varying degrees of estimation, as noted above) and will drift out of date — treat this as a snapshot, not a live feed.</div>
        </div>
      </div>

      <div class="view" id="lsview-consolidation">
        <div class="timeline-card">
          <h3>Consolidation timeline, 2023–2025</h3>
          <p class="cap">The market-growth chart on Insights and the "regional player among giants" framing on this page are both symptoms of the same thing: this industry is actively consolidating. These are real, dated deals — not a general trend statement.</p>
          <div class="timeline" id="lsMnaTimeline"></div>
        </div>
      </div>

      <div class="view" id="lsview-trends">
        <div class="trends-intro">
          <p class="cap">Revenue and headcount are logged here only when the daily research check finds a genuinely new, sourced figure — never padded for density. Most companies will show a single baseline point until the next real update lands, then grow into a real trend line.</p>
        </div>
        <div class="trends-grid" id="lsTrendsGrid"></div>
      </div>

      <div class="view" id="lsview-strategy">
        <div class="forces-card">
          <h3>Industry forces</h3>
          <p class="cap">The data above, read as a strategic picture rather than a spec sheet — what's actually driving how this market behaves.</p>
          <div class="forces-grid" id="lsForcesGrid"></div>
        </div>
      </div>

      <div class="view" id="lsview-notes">
        <div class="notes-card">
          <h3>Field notes</h3>
          <p class="cap">Your own read on this market — observations, open questions, ideas worth chasing. Visible to anyone, editable only when you're signed in.</p>
          <div id="lsAuthGate"></div>
          <div class="note-form" id="lsNoteForm">
            <select id="lsNoteType">
              <option value="observation">Observation</option>
              <option value="question">Question</option>
              <option value="idea">Idea</option>
            </select>
            <textarea id="lsNoteText" placeholder="What did you notice, wonder about, or want to test?"></textarea>
            <div class="row2">
              <input id="lsNoteRelated" placeholder="Related to (optional — e.g. a company name)" />
              <button id="lsNoteAdd">Add note</button>
            </div>
          </div>
          <div class="notes-list" id="lsNotesList"></div>
        </div>
      </div>
    `;

    document.getElementById("lsTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      document.querySelectorAll("#lsTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("#" + mount.id + " .view").forEach(v => v.classList.remove("active"));
      document.getElementById("lsview-" + btn.dataset.view).classList.add("active");
    });

    await Auth.ready;
    updateNotesGate();
    renderFieldNotes();
    document.getElementById("lsNoteAdd").addEventListener("click", async () => {
      const text = document.getElementById("lsNoteText").value.trim();
      if (!text) return;
      await supabaseClient.from("field_notes").insert({
        page: PAGE_ID,
        type: document.getElementById("lsNoteType").value,
        related: document.getElementById("lsNoteRelated").value.trim() || null,
        body: text
      });
      document.getElementById("lsNoteText").value = "";
      document.getElementById("lsNoteRelated").value = "";
      renderFieldNotes();
    });

    const onAuthOrMigrate = () => {
      if (!document.getElementById("lsAuthGate")) {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
        return;
      }
      updateNotesGate();
      renderFieldNotes();
    };
    window.addEventListener("custodian:authchange", onAuthOrMigrate);
    window.addEventListener("custodian:migrated", onAuthOrMigrate);

    let data;
    try {
      data = await fetch("data/landscape.json").then(r => r.json());
    } catch (err) {
      document.getElementById("lsview-competitors").innerHTML = `<div style="color:var(--warn);">Couldn't load Landscape data (${err.message}).</div>`;
      return;
    }
    const { companies, mnaDeals, forces } = data;
    const specialists = companies.filter(c => c.name !== "ADP");

    const maxRev = Math.max(...specialists.map(c => c.revenue));
    document.getElementById("lsChartRevenue").innerHTML = specialists.slice().sort((a, b) => b.revenue - a.revenue).map(c => `
      <div class="hbar-row">
        <div class="lbl">${c.name}</div>
        <div class="hbar-track"><div class="hbar-fill" data-w="${(c.revenue / maxRev) * 100}"></div></div>
        <div class="val mono">${fmtM(c.revenue)}</div>
      </div>`).join("") + `
      <div class="axis-ticks"><div></div><div class="ticks"><span>$0</span><span>$1B</span><span>$2B</span><span>$2.7B</span></div><div></div></div>`;

    const maxEmp = Math.max(...specialists.map(c => c.employees));
    document.getElementById("lsChartEmployees").innerHTML = specialists.slice().sort((a, b) => b.employees - a.employees).map(c => `
      <div class="hbar-row">
        <div class="lbl">${c.name}</div>
        <div class="hbar-track"><div class="hbar-fill" data-w="${(c.employees / maxEmp) * 100}"></div></div>
        <div class="val mono">${c.employees.toLocaleString()}</div>
      </div>`).join("") + `
      <div class="axis-ticks"><div></div><div class="ticks"><span>0</span><span>5,000</span><span>10,000</span></div><div></div></div>`;

    const rows = companies.slice().sort((a, b) => b.revenue - a.revenue).map(c => {
      const revPerEmp = Math.round((c.revenue * 1_000_000) / c.employees);
      return `<tr>
        <td><strong>${c.name}</strong><div style="color:var(--ink-muted); font-size:0.76rem;">${c.ticker}</div></td>
        <td class="status"><span class="status-pill ${c.status === "private" ? "private" : ""}">${c.status === "public" ? "Public" : "Private"}</span></td>
        <td>${c.model}${c.note ? `<div style="color:var(--ink-muted); font-size:0.76rem; margin-top:4px;">${c.note}</div>` : ""}</td>
        <td class="mono">${fmtM(c.revenue)}</td>
        <td class="mono">${c.employees.toLocaleString()}</td>
        <td class="mono">$${(revPerEmp / 1000).toFixed(0)}K</td>
      </tr>`;
    }).join("");
    document.getElementById("lsProfileTable").innerHTML = `
      <table class="profiles">
        <thead><tr><th>Company</th><th>Status</th><th>Business model</th><th>Revenue</th><th>Employees</th><th>Revenue / employee</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.getElementById("lsMnaTimeline").innerHTML = mnaDeals.map(d => `
      <div class="tl-item">
        <div class="tl-date mono">${d.date}</div>
        <div class="tl-deal">${d.deal}</div>
        <div class="tl-value mono">${d.value}</div>
        <div class="tl-sig">${d.sig}</div>
      </div>`).join("");

    const levelLabel = ["", "Low", "Moderate", "High"];
    document.getElementById("lsForcesGrid").innerHTML = forces.map(f => `
      <div class="force-item">
        <div class="fh">
          <h4>${f.name}</h4>
          <div class="force-level">${levelLabel[f.level]} <span class="force-dots">${[1, 2, 3].map(n => `<span class="${n <= f.level ? "on" : ""}"></span>`).join("")}</span></div>
        </div>
        <p>${f.text}</p>
      </div>`).join("");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll(".hbar-fill[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
    }));
    if (!reduceMotion) {
      document.querySelectorAll("#lsMnaTimeline .tl-item").forEach((el, i) => {
        el.style.opacity = 0; el.style.transform = "translateX(-6px)";
        el.style.transitionDelay = (i * 0.06) + "s";
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = "translateX(0)"; }));
      });
    }

    SearchIndex.register("Landscape", [
      ...companies.map(c => ({ title: c.name, snippet: c.model, route: "landscape" })),
      ...mnaDeals.map(d => ({ title: d.deal, snippet: d.sig, route: "landscape" }))
    ]);

    renderTrends();
  }

  async function renderTrends() {
    const grid = document.getElementById("lsTrendsGrid");
    if (!grid) return;
    let history;
    try {
      history = await fetch("data/history.json").then(r => r.json());
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--warn);">Couldn't load trend history (${err.message}).</div>`;
      return;
    }
    if (!document.getElementById("lsTrendsGrid")) return;

    const FIELD_LABEL = { revenue: "Revenue", employees: "Employees" };
    const byCompany = {};
    const order = [];
    history.forEach(h => {
      if (!byCompany[h.company]) { byCompany[h.company] = {}; order.push(h.company); }
      byCompany[h.company][h.field] = byCompany[h.company][h.field] || [];
      byCompany[h.company][h.field].push(h);
    });

    grid.innerHTML = order.map(company => {
      const fields = byCompany[company];
      const sections = ["revenue", "employees"].filter(f => fields[f]).map(f => {
        const points = fields[f].slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        const fmt = f === "revenue" ? fmtM : (v => v.toLocaleString());
        if (points.length === 1) {
          const p = points[0];
          return `<div class="trend-field-label">${FIELD_LABEL[f]}</div><div class="trend-baseline">Baseline ${fmt(p.value)} <span class="trend-date mono">(${p.date})</span></div>`;
        }
        const chartId = `spark-${company.replace(/[^a-z0-9]/gi, "")}-${f}`;
        return `<div class="trend-field-label">${FIELD_LABEL[f]}</div><div class="viz" id="${chartId}"></div>`;
      }).join("");
      return `<div class="chart-card"><h3>${company}</h3>${sections}</div>`;
    }).join("");

    order.forEach(company => {
      const fields = byCompany[company];
      ["revenue", "employees"].forEach(f => {
        if (!fields[f] || fields[f].length < 2) return;
        const points = fields[f].slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        const chartId = `spark-${company.replace(/[^a-z0-9]/gi, "")}-${f}`;
        renderSparkline(chartId, points, f === "revenue" ? fmtM : (v => v.toLocaleString()));
      });
    });
  }

  function renderSparkline(containerId, points, fmt) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const w = 320, h = 90, padL = 8, padR = 8, padT = 16, padB = 18;
    const innerW = w - padL - padR, innerH = h - padT - padB;
    const values = points.map(p => p.value);
    const minV = Math.min(...values), maxV = Math.max(...values);
    const span = maxV - minV || 1;
    const x = i => padL + (i / (points.length - 1)) * innerW;
    const y = v => padT + innerH - ((v - minV) / span) * innerH;
    const coords = values.map((v, i) => [x(i), y(v)]);
    const linePath = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
    const areaPath = linePath + ` L${x(points.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
    const dots = coords.map((c, i) => `<circle class="dot" id="${containerId}-dot${i}" cx="${c[0]}" cy="${c[1]}" r="3.5"/>`).join("");
    const hits = coords.map((c, i) => `<circle class="hit" cx="${c[0]}" cy="${c[1]}" r="12" fill="transparent" data-i="${i}" data-date="${points[i].date}" data-value="${fmt(points[i].value)}"/>`).join("");
    el.innerHTML = `
      <svg class="linechart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="height:${h}px;">
        <line class="baseline" x1="${padL}" x2="${w - padR}" y1="${padT + innerH}" y2="${padT + innerH}"/>
        <path class="area" d="${areaPath}"/>
        <path class="line" d="${linePath}"/>
        ${dots}
        <text class="endlabel" x="${x(0)}" y="${y(values[0]) - 8}" text-anchor="start">${fmt(values[0])}</text>
        <text class="endlabel" x="${x(values.length - 1)}" y="${y(values[values.length - 1]) - 8}" text-anchor="end">${fmt(values[values.length - 1])}</text>
        ${hits}
        <g class="spark-tip" style="opacity:0; transition: opacity .12s ease; pointer-events:none;">
          <rect class="spark-tip-rect" rx="5" fill="var(--surface)" stroke="var(--border)" stroke-width="1" height="30"/>
          <text class="spark-tip-text" x="0" y="0" text-anchor="middle" style="font-size:10px; font-weight:700; fill:var(--ink);"></text>
        </g>
      </svg>`;

    const tip = el.querySelector(".spark-tip");
    const tipRect = el.querySelector(".spark-tip-rect");
    const tipText = el.querySelector(".spark-tip-text");
    el.querySelectorAll(".hit").forEach(hit => {
      hit.addEventListener("mouseenter", () => {
        const i = hit.dataset.i;
        el.querySelectorAll(".dot").forEach(d => d.style.r = "3.5");
        const dot = document.getElementById(containerId + "-dot" + i);
        if (dot) dot.style.r = "5";
        const cx = parseFloat(hit.getAttribute("cx")), cy = parseFloat(hit.getAttribute("cy"));
        tipText.textContent = `${hit.dataset.date}: ${hit.dataset.value}`;
        const tw = Math.max(60, tipText.getComputedTextLength() + 16);
        tipRect.setAttribute("width", tw);
        tipRect.setAttribute("x", -tw / 2);
        tipRect.setAttribute("y", -30);
        tipText.setAttribute("y", -10);
        tip.setAttribute("transform", `translate(${cx}, ${cy - 6})`);
        tip.style.opacity = "1";
      });
      hit.addEventListener("mouseleave", () => {
        tip.style.opacity = "0";
        const dot = document.getElementById(containerId + "-dot" + hit.dataset.i);
        if (dot) dot.style.r = "3.5";
      });
    });
  }

  function updateNotesGate() {
    const gate = document.getElementById("lsAuthGate");
    const form = document.getElementById("lsNoteForm");
    if (!gate || !form) return;
    if (Auth.isSignedIn()) {
      gate.innerHTML = "";
      form.style.display = "";
    } else {
      form.style.display = "none";
      gate.innerHTML = `<div class="auth-gate">Sign in to add or edit notes. <button id="lsAuthGateBtn">Sign in</button></div>`;
      document.getElementById("lsAuthGateBtn").addEventListener("click", () => document.getElementById("authButton").click());
    }
  }

  async function renderFieldNotes() {
    const list = document.getElementById("lsNotesList");
    if (!list) return;
    const { data, error } = await supabaseClient
      .from("field_notes")
      .select("*")
      .eq("page", PAGE_ID)
      .order("created_at", { ascending: false });
    if (!document.getElementById("lsNotesList")) return;
    if (error) { list.innerHTML = `<div style="color:var(--warn);">Couldn't load notes (${error.message}).</div>`; return; }
    if (!data.length) { list.innerHTML = `<div class="notes-empty">No notes yet — add your first observation above.</div>`; return; }
    const signedIn = Auth.isSignedIn();
    list.innerHTML = data.map(n => `
      <div class="note-item" data-id="${n.id}">
        ${signedIn ? `<button class="note-del" title="Delete" data-id="${n.id}">✕</button>` : ""}
        <div class="nmeta">
          <span class="note-tag ${n.type}">${TYPE_LABEL[n.type]}</span>
          ${n.related ? `<span class="note-related">${n.related}</span>` : ""}
          <span class="note-date mono">${n.created_at.slice(0, 10)}</span>
        </div>
        <div class="note-text">${n.body}</div>
      </div>`).join("");
    list.querySelectorAll(".note-del").forEach(btn => {
      btn.addEventListener("click", async () => {
        await supabaseClient.from("field_notes").delete().eq("id", btn.dataset.id);
        renderFieldNotes();
      });
    });
  }

  Router.register("landscape", renderLandscapeView);
})();
