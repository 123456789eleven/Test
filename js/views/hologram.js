(function () {
  const EXEC_IDS = ["fx3", "frankIII"];
  const DIVISION_ORDER = ["strategies", "advantage", "payroll", "advisory"];
  const RADIUS = { division: 0.75, vertical: 0.34, function: 0.19 };
  const GLOW = 0x46d6ff, SHARED_GLOW = 0xffb84f, QUIET = 0x3a4250, PEOPLE_GLOW = 0x8b93c9;

  // Live org structure — divisions/verticals/functions/people/connections.
  async function loadOrgData() {
    const [divR, vertR, funcR, peopleR, connR] = await Promise.all([
      supabaseClient.from("org_divisions").select("*").order("sort_order"),
      supabaseClient.from("org_verticals").select("*").order("sort_order"),
      supabaseClient.from("org_functions").select("*").order("sort_order"),
      supabaseClient.from("org_people").select("*").order("sort_order"),
      supabaseClient.from("org_connections").select("*")
    ]);
    for (const r of [divR, vertR, funcR, peopleR, connR]) if (r.error) throw r.error;
    const verticals = {};
    vertR.data.forEach(v => { verticals[v.id] = { division: v.division, name: v.name, confirmed: v.confirmed, desc: v.desc, funcs: [] }; });
    funcR.data.forEach(f => { if (verticals[f.vertical]) verticals[f.vertical].funcs.push({ id: f.id, label: f.label, confirmed: f.confirmed }); });
    return {
      divisions: divR.data,
      verticals,
      leadership: peopleR.data.map(p => ({ id: p.id, name: p.name, title: p.title, note: p.note, parent: p.parent, cross: p.cross_divisions })),
      processConnections: connR.data.map(c => ({ from: c.from_id, to: c.to_id, type: c.type, note: c.note }))
    };
  }

  // Task/tool capability layer — from the Schema Extension work. Read-only here;
  // still function-level, matching how org_connections already works.
  async function loadTaskData() {
    const [taskR, toolR, linkR] = await Promise.all([
      supabaseClient.from("tasks").select("*"),
      supabaseClient.from("tools").select("*"),
      supabaseClient.from("task_tools").select("*")
    ]);
    for (const r of [taskR, toolR, linkR]) if (r.error) throw r.error;
    const toolsById = {};
    toolR.data.forEach(t => { toolsById[t.id] = t; });
    const toolsByTask = {};
    linkR.data.forEach(l => {
      if (!toolsByTask[l.task_id]) toolsByTask[l.task_id] = [];
      const tool = toolsById[l.tool_id];
      if (tool) toolsByTask[l.task_id].push(tool);
    });
    const tasksByFunction = {};
    taskR.data.forEach(t => {
      if (!tasksByFunction[t.function_id]) tasksByFunction[t.function_id] = [];
      tasksByFunction[t.function_id].push({ ...t, tools: toolsByTask[t.id] || [] });
    });
    return tasksByFunction;
  }

  async function renderHologramView(mount) {
    mount.innerHTML = `
      <div class="holo-page">
        <div class="holo-header">
          <h1>Kelly Benefits — Live Structure</h1>
          <a href="#/company">Company details, leadership &amp; history →</a>
        </div>
        <div class="holo-legend">
          <span class="holo-legend-item"><span class="holo-swatch" style="background:#46d6ff;"></span> Handoff connection</span>
          <span class="holo-legend-item"><span class="holo-swatch" style="background:#ffb84f;"></span> Shared connection</span>
          <span class="holo-legend-item"><span class="holo-swatch" style="background:#3a4250;"></span> No connections modeled yet</span>
          <button id="holoManageConnections" class="orgmap-fs-btn" style="display:none; margin-left:auto;">🔗 Manage connections</button>
        </div>
        <div id="holoCanvasWrap">
          <canvas id="holoCanvas"></canvas>
          <div id="holoLabel" class="holo-label">
            <span id="holoLabelText"></span>
            <button id="holoLabelAdd" class="holo-label-edit" style="display:none;">+ Add</button>
            <button id="holoLabelEdit" class="holo-label-edit" style="display:none;">✎ Edit</button>
          </div>
          <div id="holoFallback" class="holo-fallback" style="display:none;"></div>
        </div>
        <p class="holo-hint">Client outcome is deliberately not shown in the scene — no real client-quality data exists in this system yet to trace toward. Click a job function (the smallest nodes) to see its real tasks and tools, where any are recorded yet.</p>
        <div id="holoDetail" class="holo-detail" style="display:none;"></div>
      </div>
    `;

    await Auth.ready;

    const onAuthOrMigrate = () => {
      if (!document.getElementById(mount.id)) {
        window.removeEventListener("custodian:authchange", onAuthOrMigrate);
        window.removeEventListener("custodian:migrated", onAuthOrMigrate);
        return;
      }
      updateEditGate();
    };
    window.addEventListener("custodian:authchange", onAuthOrMigrate);
    window.addEventListener("custodian:migrated", onAuthOrMigrate);

    let staticData;
    try {
      staticData = await fetch("data/company.json").then(r => r.json());
    } catch (err) {
      document.getElementById("holoFallback").style.display = "block";
      document.getElementById("holoFallback").textContent = `Couldn't load Kelly Benefits data (${err.message}).`;
      return;
    }

    let data = {};
    try {
      Object.assign(data, await loadOrgData());
    } catch (err) {
      console.error("Live org data unavailable, showing last saved structure:", err);
      Object.assign(data, {
        divisions: staticData.divisions, verticals: staticData.verticals,
        leadership: staticData.leadership, processConnections: staticData.processConnections
      });
    }

    let tasksByFunction = {};
    try {
      tasksByFunction = await loadTaskData();
    } catch (err) {
      console.error("Task/tool data unavailable — function detail will just show the name:", err);
    }

    function updateEditGate() {
      const btn = document.getElementById("holoManageConnections");
      if (btn) btn.style.display = Auth.isSignedIn() ? "" : "none";
    }
    updateEditGate();
    document.getElementById("holoManageConnections").addEventListener("click", () => OrgEdit.openConnections());

    let scene3d = null;
    if (!window.THREE || !window.THREE.OrbitControls || !window.THREE.UnrealBloomPass) {
      showFallback("3D rendering library didn't load — check your connection and reload.");
    } else {
      try {
        scene3d = buildScene(data, tasksByFunction);
      } catch (err) {
        console.error("Hologram scene failed to initialize:", err);
        showFallback(`This browser/device couldn't start the 3D scene (${err.message}).`);
      }
      if (scene3d) {
        OrgEdit.init(() => data, async () => {
          try {
            data = Object.assign(data, await loadOrgData());
          } catch (err) {
            console.error("Failed to refresh hologram data:", err);
            return;
          }
          scene3d.rebuild(data);
        });
      }
    }

    function showFallback(msg) {
      const canvas = document.getElementById("holoCanvas");
      const fb = document.getElementById("holoFallback");
      if (canvas) canvas.style.display = "none";
      if (fb) { fb.style.display = "block"; fb.textContent = msg; }
    }

    SearchIndex.register("Hologram", (data.divisions || []).map(d => ({ title: `Structure: ${d.name}`, snippet: d.desc, route: "hologram" })));

    return () => {
      window.removeEventListener("custodian:authchange", onAuthOrMigrate);
      window.removeEventListener("custodian:migrated", onAuthOrMigrate);
      if (scene3d) scene3d.dispose();
    };
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function buildScene(data, tasksByFunction) {
    const THREE = window.THREE;
    const canvas = document.getElementById("holoCanvas");
    const wrap = document.getElementById("holoCanvasWrap");
    const label = document.getElementById("holoLabel");
    const labelText = document.getElementById("holoLabelText");
    const labelEdit = document.getElementById("holoLabelEdit");
    const labelAdd = document.getElementById("holoLabelAdd");

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallViewport = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 8, 15);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.6;
    controls.minDistance = 6; controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI * 0.49;

    const renderPass = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), smallViewport ? 0.55 : 0.8, 0.22, 0.28);
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.25, 64), new THREE.MeshBasicMaterial({ color: 0x0b1017 }));
    base.position.y = -0.15;
    scene.add(base);
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.5, 8.6, 64), new THREE.MeshBasicMaterial({ color: 0x1d9e75, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.02;
    scene.add(ring);

    const particleCount = smallViewport ? 90 : 220;
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 1.5 + Math.random() * 7.5, theta = Math.random() * Math.PI * 2;
      particlePos[i * 3] = Math.cos(theta) * r;
      particlePos[i * 3 + 1] = Math.random() * 4.5;
      particlePos[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particles = new THREE.Points(particleGeom, new THREE.PointsMaterial({
      color: 0x5dcaa5, size: 0.03, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(particles);

    const scanRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 9.2, 72), new THREE.MeshBasicMaterial({
      color: 0x5dcaa5, transparent: true, opacity: 0.045, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    }));
    scanRing.rotation.x = -Math.PI / 2;
    scene.add(scanRing);

    function makeNode(radius, color, opacity) {
      const geometry = new THREE.OctahedronGeometry(radius, 0);
      const fill = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      const group = new THREE.Group();
      group.add(fill); group.add(edges);
      return { group, fill };
    }

    // Fixed total wedge divided by however many children exist, not a fixed step per
    // child — so 2 siblings and 7 siblings both fit their allotted angular space
    // instead of the spread growing unbounded with count.
    function distributeAngles(centerAngle, count, totalWedge) {
      if (count <= 1) return [centerAngle];
      const step = totalWedge / (count - 1);
      const out = [];
      for (let i = 0; i < count; i++) out.push(centerAngle - totalWedge / 2 + i * step);
      return out;
    }

    let sceneState = null;
    function buildState(data) {
      const verticals = data.verticals || {};
      const divisions = DIVISION_ORDER.map(id => (data.divisions || []).find(d => d.id === id)).filter(Boolean);
      const corpfnPeople = (data.leadership || []).filter(l => l.parent === "root" && !EXEC_IDS.includes(l.id));
      const tier1 = [...divisions.map(d => ({ id: d.id, name: d.name, isCorpfn: false })), { id: "corpfn", name: "Corporate Functions", isCorpfn: true }];

      const funcConnected = new Set();
      (data.processConnections || []).forEach(c => { funcConnected.add(c.from); funcConnected.add(c.to); });
      const vertConnected = new Set(Object.entries(verticals).filter(([, v]) => v.funcs.some(f => funcConnected.has(f.id))).map(([id]) => id));
      const divConnected = new Set(
        divisions.filter(d => Object.entries(verticals).some(([id, v]) => v.division === d.id && vertConnected.has(id))).map(d => d.id)
      );

      return { verticals, divisions, corpfnPeople, tier1, funcConnected, vertConnected, divConnected, processConnections: data.processConnections || [] };
    }

    const nodeLayer = new THREE.Group();
    scene.add(nodeLayer);
    const lineLayer = new THREE.Group();
    scene.add(lineLayer);

    const nodes = new Map();      // id -> { group, fill, tier, angle, radius, y, parentId, expanded, children }
    const lines = new Map();      // "a|b" -> { line, baseOpacity }
    const hoverable = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let expandedTier1 = null, expandedTier2 = null; // accordion: one open branch per level

    function tier2Of(t1) {
      if (t1.id === "corpfn") return sceneState.corpfnPeople.map(p => ({ id: p.id, name: p.name, isPerson: true }));
      return Object.entries(sceneState.verticals).filter(([, v]) => v.division === t1.id).map(([id, v]) => ({ id, name: v.name }));
    }
    function tier3Of(t2id) {
      const v = sceneState.verticals[t2id];
      return v ? v.funcs.map(f => ({ id: f.id, name: f.label })) : [];
    }

    function addNode(item, tier, angle, radius, y, parentId) {
      const isPerson = !!item.isPerson;
      const r = tier === 1 ? RADIUS.division : tier === 2 ? RADIUS.vertical : RADIUS.function;
      let connected = false;
      if (tier === 1) connected = item.isCorpfn ? sceneState.corpfnPeople.length > 0 : sceneState.divConnected.has(item.id);
      else if (tier === 2) connected = isPerson ? true : sceneState.vertConnected.has(item.id);
      else connected = sceneState.funcConnected.has(item.id);
      const color = isPerson ? PEOPLE_GLOW : (connected ? GLOW : QUIET);
      const opacity = tier === 1 ? 0.3 : tier === 2 ? 0.34 : 0.38;
      const { group, fill } = makeNode(r, color, opacity);
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      group.position.set(x, y, z);
      const kind = tier === 1 ? (item.isCorpfn ? "corpfn" : "division") : tier === 2 ? (isPerson ? "person" : "vertical") : "function";
      fill.userData = { id: item.id, name: item.name, tier, kind, parentId, expandable: tier < 3 && !isPerson };
      nodeLayer.add(group);
      hoverable.push(fill);
      nodes.set(item.id, { group, fill, tier, angle, radius: radius, y, parentId, expanded: false, children: [] });
      return item.id;
    }

    // Every connection resolves to whichever tier is currently on screen for each end —
    // the function itself if its department is drilled all the way in, else its
    // department node, else its division (divisions are never removed, only their
    // children toggle, so this always finds something). Full recompute rather than
    // incremental: cheap at ~15 rows, correct by construction on every expand/collapse.
    function resolveVisible(functionId) {
      if (nodes.has(functionId)) return functionId;
      const vertId = window.OrgConnections.findVerticalOf(functionId, sceneState.verticals);
      if (vertId && nodes.has(vertId)) return vertId;
      const divId = vertId ? sceneState.verticals[vertId].division : null;
      if (divId && nodes.has(divId)) return divId;
      return null;
    }

    function rebuildLines() {
      lines.forEach(({ line }) => lineLayer.remove(line));
      lines.clear();
      const seen = new Set();
      sceneState.processConnections.forEach(c => {
        const a = resolveVisible(c.from), b = resolveVisible(c.to);
        if (!a || !b || a === b) return;
        const key = [a, b].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        const na = nodes.get(a), nb = nodes.get(b);
        const pa = na.group.position, pb = nb.group.position;
        const mid = pa.clone().lerp(pb, 0.5); mid.y += 0.5;
        const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
        const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
        const color = c.type === "shared" ? SHARED_GLOW : GLOW;
        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
        lineLayer.add(line);
        lines.set(key, { line, baseOpacity: 0.8 });
      });
    }

    function removeSubtree(id) {
      const n = nodes.get(id);
      if (!n) return;
      n.children.forEach(childId => removeSubtree(childId));
      n.children = [];
      if (expandedTier1 === id) expandedTier1 = null;
      if (expandedTier2 === id) expandedTier2 = null;
      nodeLayer.remove(n.group);
      const hi = hoverable.indexOf(n.fill);
      if (hi >= 0) hoverable.splice(hi, 1);
      nodes.delete(id);
    }

    function expand(id) {
      const n = nodes.get(id);
      if (!n || n.expanded) return;
      const fill = n.fill;
      // Accordion: only one open branch per level. Expanding a new sibling closes
      // whatever was open before it, so the scene stays focused on one path at a time.
      if (n.tier === 1 && expandedTier1 && expandedTier1 !== id) collapse(expandedTier1);
      if (n.tier === 2 && expandedTier2 && expandedTier2 !== id) collapse(expandedTier2);
      let children;
      if (n.tier === 1) children = tier2Of({ id });
      else children = tier3Of(id);
      if (!children.length) { rebuildLines(); return; }
      const totalWedge = n.tier === 1 ? 0.95 : 0.5;
      const outward = n.tier === 1 ? 1.9 : 1.6;
      const yStep = n.tier === 1 ? -0.65 : -0.55;
      const angles = distributeAngles(n.angle, children.length, totalWedge);
      children.forEach((child, i) => {
        const childId = addNode(child, n.tier + 1, angles[i], n.radius + outward, n.y + yStep, id);
        n.children.push(childId);
      });
      n.expanded = true;
      fill.userData.expanded = true;
      if (n.tier === 1) expandedTier1 = id;
      if (n.tier === 2) expandedTier2 = id;
      rebuildLines();
    }

    function collapse(id) {
      const n = nodes.get(id);
      if (!n || !n.expanded) return;
      n.children.forEach(childId => removeSubtree(childId));
      n.children = [];
      n.expanded = false;
      n.fill.userData.expanded = false;
      if (expandedTier1 === id) expandedTier1 = null;
      if (expandedTier2 === id) expandedTier2 = null;
      rebuildLines();
    }

    function toggle(id) {
      const n = nodes.get(id);
      if (!n || !n.fill.userData.expandable) return;
      if (n.expanded) collapse(id); else expand(id);
    }

    let detailOpenId = null;
    function showFunctionDetail(id) {
      const detail = document.getElementById("holoDetail");
      if (!detail) return;
      if (detailOpenId === id) { detail.style.display = "none"; detailOpenId = null; return; }
      detailOpenId = id;
      const n = nodes.get(id);
      const name = n ? n.fill.userData.name : id;
      const tasks = tasksByFunction[id] || [];
      detail.innerHTML = `
        <button class="holo-detail-close" type="button">✕</button>
        <h4>${esc(name)}</h4>
        ${tasks.length ? tasks.map(t => `
          <div class="holo-detail-task">
            <div class="holo-detail-task-name">${esc(t.name)}</div>
            ${t.description ? `<div class="holo-detail-task-desc">${esc(t.description)}</div>` : ""}
            ${t.tools.length ? `<div class="holo-detail-tools">${t.tools.map(tool => `<span class="holo-tool-chip">${esc(tool.name)}</span>`).join("")}</div>` : ""}
          </div>
        `).join("") : `<p class="cmap-detail-empty">No tasks recorded yet for this function.</p>`}
      `;
      detail.style.display = "block";
      detail.querySelector(".holo-detail-close").addEventListener("click", () => { detail.style.display = "none"; detailOpenId = null; });
    }

    function editKindFor(kind) {
      if (kind === "division") return "division";
      if (kind === "vertical") return "vertical";
      if (kind === "function") return "function";
      if (kind === "person") return "person";
      return null;
    }
    // Divisions are edit-only by design (no add/delete — the same rule js/orgedit.js
    // already enforces; the four divisions are fixed). Corporate's "children" are
    // people, not departments.
    function addKindFor(userData) {
      if (userData.tier === 1) return userData.kind === "corpfn" ? "person" : "vertical";
      if (userData.tier === 2 && userData.kind === "vertical") return "function";
      return null;
    }

    function initTier1() {
      sceneState.tier1.forEach((t1, i) => {
        const angle = (i / sceneState.tier1.length) * Math.PI * 2;
        addNode(t1, 1, angle, 5.5, 1.6, null);
      });
      rebuildLines();
    }

    function rebuild(newData) {
      Array.from(nodes.keys()).forEach(id => { const n = nodes.get(id); if (n) { nodeLayer.remove(n.group); } });
      nodes.clear(); hoverable.length = 0;
      lines.forEach(({ line }) => lineLayer.remove(line));
      lines.clear();
      expandedTier1 = null; expandedTier2 = null;
      sceneState = buildState(newData);
      initTier1();
    }

    sceneState = buildState(data);
    initTier1();

    function fit() {
      const w = wrap.clientWidth, h = smallViewport ? 420 : 600;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    function raycastAt(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hoverable);
      return hits.length ? hits[0].object : null;
    }
    function onPointerMove(e) {
      const hit = raycastAt(e.clientX, e.clientY);
      if (hit) {
        label.style.display = "flex";
        label.style.left = (e.clientX + 14) + "px";
        label.style.top = (e.clientY + 14) + "px";
        labelText.textContent = hit.userData.name + (hit.userData.expandable ? (hit.userData.expanded ? " (click to collapse)" : " (click to expand)") : "");
        const editKind = editKindFor(hit.userData.kind);
        if (editKind && Auth.isSignedIn()) {
          labelEdit.style.display = "";
          labelEdit.dataset.kind = editKind;
          labelEdit.dataset.id = hit.userData.id;
          labelEdit.dataset.parent = hit.userData.parentId || "";
        } else {
          labelEdit.style.display = "none";
        }
        const addKind = addKindFor(hit.userData);
        if (addKind && Auth.isSignedIn()) {
          labelAdd.style.display = "";
          labelAdd.dataset.kind = addKind;
          labelAdd.dataset.parent = hit.userData.id;
          labelAdd.textContent = addKind === "person" ? "+ Add person" : addKind === "function" ? "+ Add function" : "+ Add department";
        } else {
          labelAdd.style.display = "none";
        }
        const hitId = hit.userData.id;
        lines.forEach((entry, key) => { entry.baseOpacity = key.split("|").includes(hitId) ? 1 : 0.08; });
      } else {
        label.style.display = "none";
        lines.forEach(entry => { entry.baseOpacity = 0.8; });
      }
    }
    labelEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      const { kind, id, parent } = labelEdit.dataset;
      OrgEdit.open(kind, "edit", id, parent || null);
    });
    labelAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      const { kind, parent } = labelAdd.dataset;
      OrgEdit.open(kind, "add", null, parent);
    });

    // OrbitControls owns mousedown/mousemove/mouseup on this element for orbiting, and
    // the native "click" event that follows doesn't reliably fire once OrbitControls has
    // treated a few pixels of jitter as a drag. Track our own pointerdown->pointerup
    // distance/time instead of trusting "click".
    let downX = 0, downY = 0, downT = 0, isDown = false;
    renderer.domElement.addEventListener("pointerdown", (e) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now(); isDown = true;
    });
    renderer.domElement.addEventListener("pointerup", (e) => {
      if (!isDown) return;
      isDown = false;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = performance.now() - downT;
      if (dist > 6 || dt > 500) return;
      const hit = raycastAt(e.clientX, e.clientY);
      if (!hit) return;
      if (hit.userData.tier === 3) showFunctionDetail(hit.userData.id);
      else toggle(hit.userData.id);
    });
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    let scanT = 0;
    let rafId, disposed = false;
    function animate() {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      controls.update();
      if (!reduceMotion) {
        const pos = particleGeom.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3 + 1] += 0.004;
          if (pos[i * 3 + 1] > 4.5) pos[i * 3 + 1] = 0;
        }
        particleGeom.attributes.position.needsUpdate = true;
        scanT += 0.006;
        scanRing.position.y = (Math.sin(scanT) * 0.5 + 0.5) * 3.6;
        scanRing.material.opacity = 0.03 + 0.045 * (1 - Math.abs(Math.sin(scanT)));
        lines.forEach((entry, key) => {
          let phase = 0;
          for (let i = 0; i < key.length; i++) phase += key.charCodeAt(i);
          entry.line.material.opacity = entry.baseOpacity * (0.7 + 0.3 * Math.sin(scanT * 2.4 + phase));
        });
      } else {
        lines.forEach(entry => { entry.line.material.opacity = entry.baseOpacity; });
      }
      composer.render();
    }
    window.addEventListener("resize", fit);
    fit();
    animate();

    function dispose() {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", fit);
      controls.dispose();
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    }

    return { rebuild, dispose };
  }

  Router.register("hologram", renderHologramView, { fullscreen: true });
})();
