(function () {
  const EXEC_IDS = ["fx3", "frankIII"];
  const DIVISION_ORDER = ["strategies", "advantage", "payroll", "advisory"];
  const RADIUS = { division: 0.75, vertical: 0.34, function: 0.19 };
  const GLOW = 0x46d6ff, SHARED_GLOW = 0xffb84f, QUIET = 0x3a4250, PEOPLE_GLOW = 0x8b93c9;

  // Own data fetch — same shape as fullcircle.js/orgtree.js, deliberately not shared.
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

  async function renderHologramView(mount) {
    mount.innerHTML = `
      <div class="page-head">
        <h1>Kelly Benefits — Hologram</h1>
        <p>A new, unified take on structure and connections together — drag to orbit, scroll to zoom, click a division or department to expand it. Full Circle and Org Tree stay put; this is a third view, not a replacement, while it's still being tuned. <a href="#/full-circle">Full Circle</a> · <a href="#/org-tree">Org Tree</a></p>
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
          <button id="holoLabelEdit" class="holo-label-edit" style="display:none;">✎ Edit</button>
        </div>
        <div id="holoFallback" class="holo-fallback" style="display:none;"></div>
      </div>
      <p class="holo-hint">Client outcome is deliberately not shown here — no real client-quality data exists in this system yet to trace toward.</p>
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

    let data;
    try {
      data = await loadOrgData();
    } catch (err) {
      document.getElementById("holoFallback").style.display = "block";
      document.getElementById("holoFallback").textContent = `Couldn't load org data (${err.message}).`;
      return;
    }

    function updateEditGate() {
      const btn = document.getElementById("holoManageConnections");
      if (btn) btn.style.display = Auth.isSignedIn() ? "" : "none";
    }
    updateEditGate();
    document.getElementById("holoManageConnections").addEventListener("click", () => OrgEdit.openConnections());

    if (!window.THREE || !window.THREE.OrbitControls || !window.THREE.UnrealBloomPass) {
      showFallback("3D rendering library didn't load — check your connection and reload. Meanwhile, try Full Circle or Org Tree.");
      return;
    }

    let scene3d;
    try {
      scene3d = buildScene(data);
    } catch (err) {
      console.error("Hologram scene failed to initialize:", err);
      showFallback(`This browser/device couldn't start the 3D scene (${err.message}). Try Full Circle or Org Tree instead.`);
      return;
    }

    OrgEdit.init(() => data, async () => {
      try {
        data = await loadOrgData();
      } catch (err) {
        console.error("Failed to refresh hologram data:", err);
        return;
      }
      scene3d.rebuild(data);
    });

    function showFallback(msg) {
      const canvas = document.getElementById("holoCanvas");
      const fb = document.getElementById("holoFallback");
      if (canvas) canvas.style.display = "none";
      if (fb) { fb.style.display = "block"; fb.textContent = msg; }
    }

    SearchIndex.register("Hologram", [
      ...data.divisions.map(d => ({ title: `Hologram: ${d.name}`, snippet: d.desc, route: "hologram" }))
    ]);
  }

  function buildScene(data) {
    const THREE = window.THREE;
    const canvas = document.getElementById("holoCanvas");
    const wrap = document.getElementById("holoCanvasWrap");
    const label = document.getElementById("holoLabel");
    const labelText = document.getElementById("holoLabelText");
    const labelEdit = document.getElementById("holoLabelEdit");

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
    // instead of the spread growing unbounded with count (real data is ~4x denser
    // than the prototype this was adapted from).
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

    const nodes = new Map();      // id -> { group, fill, tier, angle, radius, y, parentId }
    const lines = new Map();      // "a|b" -> THREE.Line
    const visibleFuncIds = new Set();
    const hoverable = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

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
      fill.userData = { id: item.id, name: item.name, tier, kind: tier === 1 ? (item.isCorpfn ? "corpfn" : "division") : tier === 2 ? (isPerson ? "person" : "vertical") : "function", parentId, expandable: tier < 3 && !isPerson };
      nodeLayer.add(group);
      hoverable.push(fill);
      nodes.set(item.id, { group, fill, tier, angle, radius: radius, y, parentId, expanded: false, children: [] });
      if (tier === 3) visibleFuncIds.add(item.id);
      checkNewFunctionLines();
      return item.id;
    }

    function checkNewFunctionLines() {
      sceneState.processConnections.forEach(c => {
        const key = [c.from, c.to].sort().join("|");
        if (lines.has(key)) return;
        if (!visibleFuncIds.has(c.from) || !visibleFuncIds.has(c.to)) return;
        const a = nodes.get(c.from), b = nodes.get(c.to);
        if (!a || !b) return;
        const pa = a.group.position, pb = b.group.position;
        const mid = pa.clone().lerp(pb, 0.5); mid.y += 0.5;
        const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
        const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
        const color = c.type === "shared" ? SHARED_GLOW : GLOW;
        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
        lineLayer.add(line);
        lines.set(key, line);
      });
    }

    function removeSubtree(id) {
      const n = nodes.get(id);
      if (!n) return;
      n.children.forEach(childId => removeSubtree(childId));
      n.children = [];
      if (n.tier === 3) {
        visibleFuncIds.delete(id);
        Array.from(lines.entries()).forEach(([key, line]) => {
          if (key.split("|").includes(id)) { lineLayer.remove(line); lines.delete(key); }
        });
      }
      nodeLayer.remove(n.group);
      const hi = hoverable.indexOf(n.fill);
      if (hi >= 0) hoverable.splice(hi, 1);
      nodes.delete(id);
    }

    function expand(id) {
      const n = nodes.get(id);
      if (!n || n.expanded) return;
      const fill = n.fill;
      let children;
      if (n.tier === 1) children = tier2Of({ id, isCorpfn: fill.userData.kind === "corpfn" });
      else children = tier3Of(id);
      if (!children.length) return;
      // Tier-2's wedge (department fan around a division) is generous since siblings
      // are far apart on the circle. Tier-3's wedge (function fan around a department)
      // is tighter — real departments sit close together (e.g. Advantage's 5), so a
      // wide function fan on two adjacent expanded departments would overlap.
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
    }

    function collapse(id) {
      const n = nodes.get(id);
      if (!n || !n.expanded) return;
      n.children.forEach(childId => removeSubtree(childId));
      n.children = [];
      n.expanded = false;
      n.fill.userData.expanded = false;
    }

    function toggle(id) {
      const n = nodes.get(id);
      if (!n || !n.fill.userData.expandable) return;
      if (n.expanded) collapse(id); else expand(id);
    }

    function editKindFor(kind) {
      if (kind === "division") return "division";
      if (kind === "vertical") return "vertical";
      if (kind === "function") return "function";
      if (kind === "person") return "person";
      return null;
    }

    function initTier1() {
      sceneState.tier1.forEach((t1, i) => {
        const angle = (i / sceneState.tier1.length) * Math.PI * 2;
        addNode(t1, 1, angle, 5.5, 1.6, null);
      });
    }

    function rebuild(newData) {
      Array.from(nodes.keys()).forEach(id => { const n = nodes.get(id); if (n) { nodeLayer.remove(n.group); } });
      nodes.clear(); hoverable.length = 0; visibleFuncIds.clear();
      lines.forEach(line => lineLayer.remove(line));
      lines.clear();
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
      lines.forEach(line => { line.material.opacity = 0.8; });
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
        const hitId = hit.userData.id;
        lines.forEach((line, key) => {
          const on = key.split("|").includes(hitId);
          line.material.opacity = on ? 1 : 0.1;
        });
      } else {
        label.style.display = "none";
      }
    }
    // Click does its own raycast at the click point rather than trusting the last
    // pointermove's result — pointermove isn't guaranteed to fire before a tap on
    // touch devices, so relying on stale hover state would make tap-to-expand
    // unreliable on mobile.
    function onClick(e) {
      const hit = raycastAt(e.clientX, e.clientY);
      if (hit) toggle(hit.userData.id);
    }
    labelEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      const { kind, id, parent } = labelEdit.dataset;
      OrgEdit.open(kind, "edit", id, parent || null);
    });

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    let scanT = 0;
    let rafId;
    function animate() {
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
      }
      composer.render();
    }
    window.addEventListener("resize", fit);
    fit();
    animate();

    return { rebuild };
  }

  Router.register("hologram", renderHologramView);
})();
