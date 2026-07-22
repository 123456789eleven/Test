(function () {
  const HUBS = {
    kelly:    { label: "Kelly Benefits",            color: "#3b82f6" },
    industry: { label: "Industry / TPA World",       color: "#10b981" },
    mentors:  { label: "Mentors & Advisors",         color: "#e8935a" },
    network:  { label: "Recruiters & Opportunities", color: "#8b5cf6" }
  };
  const HUB_ORDER = ["kelly", "industry", "mentors", "network"];
  const STRENGTH_LABEL = { 1: "Just met", 2: "Know each other", 3: "Close relationship" };

  let contacts = [];
  let activeFilter = "all";

  function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "")).toUpperCase();
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function renderContactsView(mount) {
    mount.innerHTML = `
      <div class="kb-hero">
        <div class="kb-hero-content">
          <h1>Contacts — Your Network</h1>
          <p>The people behind a career: internal allies at Kelly Benefits, contacts across the industry, mentors, and recruiters — mapped, not just listed. This is the one section on Custodian that's private. Everything else here is open to read; this page requires signing in to view, not just to edit, because it's about real people rather than public research.</p>
        </div>
      </div>
      <div id="crmBody"></div>
    `;

    await Auth.ready;
    renderGate();
    window.addEventListener("custodian:authchange", onAuthChange);
  }

  function onAuthChange() {
    if (!document.getElementById("crmBody")) {
      window.removeEventListener("custodian:authchange", onAuthChange);
      return;
    }
    renderGate();
  }

  function renderGate() {
    const el = document.getElementById("crmBody");
    if (!el) return;
    if (!Auth.isSignedIn()) {
      el.innerHTML = `
        <div class="crm-lock">
          <div class="crm-lock-icon">🔒</div>
          <h3>Sign in to view your network</h3>
          <p class="cap">Nothing below loads until you're signed in — no names, no notes are fetched for a signed-out visitor.</p>
          <button id="crmLockBtn">Sign in</button>
        </div>
      `;
      document.getElementById("crmLockBtn").addEventListener("click", () => document.getElementById("authButton").click());
      return;
    }
    loadContacts(el);
  }

  async function loadContacts(el) {
    el.innerHTML = `<div class="loading">Loading your network…</div>`;
    const { data, error } = await supabaseClient.from("contacts").select("*").order("name");
    if (!document.getElementById("crmBody")) return;
    if (error) {
      el.innerHTML = `<div style="color:var(--warn); max-width:60ch;">Couldn't load contacts (${esc(error.message)}). If this is the very first setup, the "contacts" table may not exist in Supabase yet — see the setup note you were given for the SQL to run once in the Supabase SQL editor.</div>`;
      return;
    }
    contacts = data || [];
    activeFilter = "all";
    el.innerHTML = bodyHtml();
    wireBody();
    renderNetwork();
    renderList();
  }

  function bodyHtml() {
    const withNextStep = contacts.filter(c => c.next_step).length;
    const categoriesUsed = new Set(contacts.map(c => c.category)).size;
    return `
      <div class="kb-hero-stats" style="margin: 0 0 26px;">
        <div class="kb-stat"><div class="kb-stat-big">${contacts.length}</div><div class="kb-stat-label">People in your network</div></div>
        <div class="kb-stat"><div class="kb-stat-big">${withNextStep}</div><div class="kb-stat-label">With an open next step</div></div>
        <div class="kb-stat"><div class="kb-stat-big">${categoriesUsed}</div><div class="kb-stat-label">of 4 categories represented</div></div>
      </div>

      <div class="cmap-wrap" id="crmNetWrap">
        <div class="cmap-head">
          <div>
            <h3>Your network, mapped</h3>
            <p class="cap">Grouped by relationship type. Click anyone to see their detail; everyone else fades.</p>
          </div>
          <button id="crmNetFullscreen" class="cmap-fs-btn">⛶ Fullscreen</button>
        </div>
        <div id="crmNetContainer" class="cmap-container"></div>
        <div class="cmap-legend">
          ${HUB_ORDER.map(k => `<span><i style="background:${HUBS[k].color}"></i>${HUBS[k].label}</span>`).join("")}
        </div>
      </div>
      <div id="crmNetDetail"></div>

      <div class="notes-card">
        <h3>Add a contact</h3>
        <p class="cap">Name is the only thing required — fill in what you know now and come back to the rest later.</p>
        <div class="crm-form" id="crmForm">
          <input id="crmName" placeholder="Name *" />
          <input id="crmRole" placeholder="Role / title" />
          <input id="crmCompany" placeholder="Company" />
          <select id="crmCategory">${HUB_ORDER.map(k => `<option value="${k}">${HUBS[k].label}</option>`).join("")}</select>
          <select id="crmStrength">
            <option value="1">Just met</option>
            <option value="2" selected>Know each other</option>
            <option value="3">Close relationship</option>
          </select>
          <input id="crmLastContact" type="date" />
          <input id="crmNextStep" class="crm-full" placeholder="Next step (optional) — e.g. follow up after the Q3 review" />
          <textarea id="crmNotes" class="crm-full" placeholder="Notes"></textarea>
          <div class="crm-form-actions"><button id="crmAdd">Add contact</button></div>
        </div>
      </div>

      <div class="cat-filters" id="crmFilters">
        <button class="cat-chip active" data-cat="all">All</button>
        ${HUB_ORDER.map(k => `<button class="cat-chip" data-cat="${k}">${HUBS[k].label}</button>`).join("")}
      </div>
      <div id="crmList" class="contact-grid"></div>
    `;
  }

  function wireBody() {
    document.getElementById("crmAdd").addEventListener("click", addContact);
    document.getElementById("crmFilters").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      document.querySelectorAll("#crmFilters .cat-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.cat;
      renderList();
    });
  }

  async function addContact() {
    const name = document.getElementById("crmName").value.trim();
    if (!name) { document.getElementById("crmName").focus(); return; }
    const btn = document.getElementById("crmAdd");
    btn.disabled = true;
    const payload = {
      name,
      role: document.getElementById("crmRole").value.trim() || null,
      company: document.getElementById("crmCompany").value.trim() || null,
      category: document.getElementById("crmCategory").value,
      strength: Number(document.getElementById("crmStrength").value),
      last_contact: document.getElementById("crmLastContact").value || null,
      next_step: document.getElementById("crmNextStep").value.trim() || null,
      notes: document.getElementById("crmNotes").value.trim() || null
    };
    const { error } = await supabaseClient.from("contacts").insert(payload);
    btn.disabled = false;
    if (error) { alert("Couldn't save that contact: " + error.message); return; }
    const el = document.getElementById("crmBody");
    if (el) loadContacts(el);
  }

  async function deleteContact(id) {
    await supabaseClient.from("contacts").delete().eq("id", id);
    const el = document.getElementById("crmBody");
    if (el) loadContacts(el);
  }

  function renderList() {
    const list = document.getElementById("crmList");
    if (!list) return;
    const filtered = activeFilter === "all" ? contacts : contacts.filter(c => c.category === activeFilter);
    if (!filtered.length) {
      list.innerHTML = `<div class="contact-grid-empty">No one here yet — add your first contact above.</div>`;
      return;
    }
    list.innerHTML = filtered.map(c => {
      const hub = HUBS[c.category] || HUBS.network;
      return `
        <div class="contact-card" data-id="${c.id}">
          <button class="cc-del" data-id="${c.id}" title="Delete">✕</button>
          <div class="cc-head">
            <div class="cc-avatar" style="background:${hub.color}">${esc(initials(c.name))}</div>
            <div>
              <div class="cc-name">${esc(c.name)}</div>
              <div class="cc-role">${[esc(c.role), esc(c.company)].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <div class="cc-meta">${hub.label} · ${STRENGTH_LABEL[c.strength] || STRENGTH_LABEL[2]}${c.last_contact ? ` · last contact ${esc(c.last_contact)}` : ""}</div>
          ${c.next_step ? `<div class="cc-next">→ ${esc(c.next_step)}</div>` : ""}
          ${c.notes ? `<div class="cc-notes">${esc(c.notes)}</div>` : ""}
        </div>
      `;
    }).join("");
    list.querySelectorAll(".cc-del").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); deleteContact(btn.dataset.id); });
    });
  }

  function renderDetail(person) {
    const panel = document.getElementById("crmNetDetail");
    if (!panel) return;
    const hub = HUBS[person.category] || HUBS.network;
    panel.innerHTML = `
      <div class="dd-head">
        <div><h2>${esc(person.name)}</h2><div class="dd-leaders">${[esc(person.role), esc(person.company)].filter(Boolean).join(" · ") || hub.label}</div></div>
        <button id="closeCrmDetail">Close ✕</button>
      </div>
      <p class="desc">${hub.label} · ${STRENGTH_LABEL[person.strength] || STRENGTH_LABEL[2]}${person.last_contact ? ` · last contact ${esc(person.last_contact)}` : ""}</p>
      ${person.next_step ? `<div class="cc-next" style="display:inline-block;">→ ${esc(person.next_step)}</div>` : ""}
      ${person.notes ? `<p style="color:var(--ink-soft); font-size:0.88rem; line-height:1.55; margin-top:12px;">${esc(person.notes)}</p>` : ""}
    `;
    panel.classList.add("show");
    document.getElementById("closeCrmDetail").addEventListener("click", () => panel.classList.remove("show"));
  }

  function renderNetwork() {
    const containerId = "crmNetContainer";
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!contacts.length) {
      container.innerHTML = `<div class="contact-grid-empty" style="padding:40px 20px;">Add your first contact below and they'll show up here.</div>`;
      return;
    }

    const width = Math.max(container.clientWidth || 0, 760);
    const height = Math.max(520, Math.round((typeof window !== "undefined" ? window.innerHeight : 700) * 0.6));
    const cx = width / 2, cy = height / 2;
    const hubRadius = Math.min(width, height) * 0.2;
    const personRadius = Math.min(width, height) * 0.4;
    const sectorSize = (2 * Math.PI) / HUB_ORDER.length;

    const byHub = {};
    HUB_ORDER.forEach(h => { byHub[h] = []; });
    contacts.forEach(c => { (byHub[c.category] || byHub.network).push(c); });

    const hubNodes = HUB_ORDER.map((id, i) => {
      const angle = i * sectorSize - Math.PI / 2;
      return { id, kind: "hub", label: HUBS[id].label, color: HUBS[id].color, x: cx + Math.cos(angle) * hubRadius, y: cy + Math.sin(angle) * hubRadius };
    });

    const personNodes = [];
    HUB_ORDER.forEach((hubId, hi) => {
      const people = byHub[hubId];
      const baseAngle = hi * sectorSize - Math.PI / 2;
      const usable = sectorSize * 0.74;
      people.forEach((p, pi) => {
        const a = people.length > 1 ? baseAngle + (pi - (people.length - 1) / 2) * (usable / (people.length - 1)) : baseAngle;
        personNodes.push({
          id: p.id, kind: "person", label: p.name, hub: hubId, color: HUBS[hubId].color,
          x: cx + Math.cos(a) * personRadius, y: cy + Math.sin(a) * personRadius, angle: a, data: p
        });
      });
    });

    const allNodes = [...hubNodes, ...personNodes];
    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));

    const svgNS = "http://www.w3.org/2000/svg";
    container.innerHTML = "";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("class", "cmap-svg");

    const spokeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(spokeLayer);
    personNodes.forEach(p => {
      const hub = nodeById[p.hub];
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", hub.x); line.setAttribute("y1", hub.y);
      line.setAttribute("x2", p.x); line.setAttribute("y2", p.y);
      line.setAttribute("class", "cmap-spoke");
      line.setAttribute("stroke", hub.color);
      line.dataset.hub = p.hub;
      spokeLayer.appendChild(line);
    });

    const nodeLayer = document.createElementNS(svgNS, "g");
    svg.appendChild(nodeLayer);
    allNodes.forEach(n => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "cmap-node cmap-node-" + n.kind);
      g.setAttribute("transform", `translate(${n.x},${n.y})`);
      g.dataset.id = n.id;
      g.tabIndex = 0;
      g.setAttribute("role", "button");
      const r = n.kind === "hub" ? 30 : 17;
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("r", r);
      circle.setAttribute("class", "cmap-circle");
      circle.setAttribute("fill", n.color);
      g.appendChild(circle);

      if (n.kind === "person") {
        const initEl = document.createElementNS(svgNS, "text");
        initEl.setAttribute("class", "cmap-initials");
        initEl.setAttribute("text-anchor", "middle");
        initEl.setAttribute("dy", "0.34em");
        initEl.textContent = initials(n.label);
        g.appendChild(initEl);
      }

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("class", "cmap-label" + (n.kind === "hub" ? " cmap-label-hub" : ""));
      if (n.kind === "hub") {
        label.setAttribute("y", -(r + 12));
        label.setAttribute("text-anchor", "middle");
      } else {
        const deg = (n.angle * 180) / Math.PI;
        const facingLeft = deg > 90 || deg < -90;
        const labelOffset = r + 8;
        label.setAttribute("x", facingLeft ? -labelOffset : labelOffset);
        label.setAttribute("dy", "0.32em");
        label.setAttribute("text-anchor", facingLeft ? "end" : "start");
      }
      label.textContent = n.kind === "hub" ? n.label : (n.label.length > 20 ? n.label.slice(0, 18) + "…" : n.label);
      g.appendChild(label);

      function activate() {
        setFocus(n.id);
        if (n.kind === "person") renderDetail(n.data);
      }
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
      nodeLayer.appendChild(g);
    });

    function setFocus(id) {
      const node = nodeById[id];
      const connected = new Set([id]);
      if (node && node.kind === "person") connected.add(node.hub);
      if (node && node.kind === "hub") personNodes.filter(p => p.hub === id).forEach(p => connected.add(p.id));
      nodeLayer.querySelectorAll(".cmap-node").forEach(el => el.classList.toggle("dim", !connected.has(el.dataset.id)));
      spokeLayer.querySelectorAll(".cmap-spoke").forEach(el => {
        el.classList.toggle("hi", node && node.kind === "hub" ? el.dataset.hub === id : connected.has(el.dataset.hub));
        el.classList.toggle("dim", !(node && node.kind === "hub" ? el.dataset.hub === id : connected.has(el.dataset.hub)));
      });
    }

    container.appendChild(svg);

    const fsBtn = document.getElementById("crmNetFullscreen");
    const wrap = document.getElementById("crmNetWrap");
    if (fsBtn && wrap) {
      fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) wrap.requestFullscreen(); else document.exitFullscreen();
      });
    }
    if (!renderNetwork.wiredFsChange) {
      renderNetwork.wiredFsChange = true;
      document.addEventListener("fullscreenchange", () => {
        const btn = document.getElementById("crmNetFullscreen");
        const w = document.getElementById("crmNetWrap");
        if (!btn || !w) return;
        btn.textContent = document.fullscreenElement === w ? "✕ Exit fullscreen" : "⛶ Fullscreen";
      });
    }
  }

  Router.register("contacts", renderContactsView);
})();
