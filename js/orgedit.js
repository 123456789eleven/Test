(function () {
  let getData = () => ({});
  let onSaved = async () => {};

  function overlay() { return document.getElementById("orgEditOverlay"); }
  function body() { return document.getElementById("orgEditBody"); }

  function closeModal() { overlay().classList.remove("show"); }
  function showModal(html) { body().innerHTML = html; overlay().classList.add("show"); }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
  }
  function newId(name) { return slugify(name) + "-" + Date.now().toString(36).slice(-4); }

  async function withError(promise) {
    const { error } = await promise;
    if (error) throw error;
  }

  function findFunctionEntry(id) {
    const verticals = getData().verticals || {};
    for (const [vid, v] of Object.entries(verticals)) {
      const f = v.funcs.find(x => x.id === id);
      if (f) return { func: f, verticalId: vid };
    }
    return null;
  }
  function funcLabel(id) {
    const found = findFunctionEntry(id);
    return found ? found.func.label : id;
  }

  function divisionOptions(selected) {
    return (getData().divisions || []).map(d => `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${esc(d.name)}</option>`).join("");
  }
  function verticalOptions(selected) {
    const verticals = getData().verticals || {};
    return Object.entries(verticals).map(([id, v]) => `<option value="${id}" ${id === selected ? "selected" : ""}>${esc(v.name)}</option>`).join("");
  }
  function parentOptions(selected) {
    const opts = [`<option value="root" ${selected === "root" ? "selected" : ""}>— none (top level) —</option>`]
      .concat((getData().divisions || []).map(d => `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${esc(d.name)}</option>`));
    return opts.join("");
  }
  function allFunctionOptions(selected) {
    const verticals = getData().verticals || {};
    const opts = [];
    Object.values(verticals).forEach(v => v.funcs.forEach(f => opts.push(`<option value="${f.id}" ${f.id === selected ? "selected" : ""}>${esc(f.label)}</option>`)));
    return opts.join("");
  }

  function formShell(title, sub, fieldsHtml, { showDelete, deleteLabel } = {}) {
    return `
      <h3>${title}</h3>
      ${sub ? `<p class="auth-modal-sub">${sub}</p>` : ""}
      <div class="oe-form">
        ${fieldsHtml}
        <div class="oe-error" id="oeError"></div>
        <div class="oe-actions">
          <button id="oeSave" class="oe-save" type="button">Save</button>
          <button id="oeCancel" class="oe-cancel" type="button">Cancel</button>
          ${showDelete ? `<button id="oeDelete" class="oe-delete" type="button">${deleteLabel || "Delete"}</button>` : ""}
        </div>
      </div>
    `;
  }

  function wireCancelAndClose() {
    document.getElementById("oeCancel").addEventListener("click", closeModal);
  }
  function setError(msg) {
    const el = document.getElementById("oeError");
    if (el) el.textContent = msg;
  }

  // ---- Division (update-only) ----
  function openDivision(id) {
    const d = (getData().divisions || []).find(x => x.id === id);
    if (!d) return;
    showModal(formShell("Edit division", "Text fields only — competitor benchmarks aren't editable here.", `
      <label>Name<input id="oeName" value="${esc(d.name)}"></label>
      <label>Role (short tag)<input id="oeRole" value="${esc(d.role)}"></label>
      <label>Description<textarea id="oeDesc">${esc(d.desc)}</textarea></label>
      <label>Scale note<textarea id="oeScale">${esc(d.scale)}</textarea></label>
      <label>Unit label<input id="oeUnit" value="${esc(d.unit)}"></label>
      <label>Chart caption<textarea id="oeCaption">${esc(d.caption)}</textarea></label>
    `));
    wireCancelAndClose();
    document.getElementById("oeSave").addEventListener("click", async () => {
      try {
        await withError(supabaseClient.from("org_divisions").update({
          name: document.getElementById("oeName").value.trim(),
          role: document.getElementById("oeRole").value.trim(),
          desc: document.getElementById("oeDesc").value.trim(),
          scale: document.getElementById("oeScale").value.trim(),
          unit: document.getElementById("oeUnit").value.trim(),
          caption: document.getElementById("oeCaption").value.trim()
        }).eq("id", id));
        closeModal();
        await onSaved();
      } catch (err) { setError(err.message); }
    });
  }

  // ---- Vertical / department ----
  function openVertical(mode, id, divisionId) {
    const isAdd = mode === "add";
    const v = isAdd ? null : (getData().verticals || {})[id];
    if (!isAdd && !v) return;
    const div = isAdd ? divisionId : v.division;
    showModal(formShell(isAdd ? "Add department" : "Edit department", "", `
      <label>Division<select id="oeDivision">${divisionOptions(div)}</select></label>
      <label>Name<input id="oeName" value="${isAdd ? "" : esc(v.name)}"></label>
      <label>Description<textarea id="oeDesc">${isAdd ? "" : esc(v.desc)}</textarea></label>
      <label class="oe-checkbox"><input type="checkbox" id="oeConfirmed" ${!isAdd && v.confirmed ? "checked" : ""}> Confirmed (vs. estimated)</label>
    `, { showDelete: !isAdd, deleteLabel: "Delete department" }));
    wireCancelAndClose();
    document.getElementById("oeSave").addEventListener("click", async () => {
      const name = document.getElementById("oeName").value.trim();
      if (!name) { setError("Name is required."); return; }
      const payload = {
        division: document.getElementById("oeDivision").value,
        name,
        desc: document.getElementById("oeDesc").value.trim(),
        confirmed: document.getElementById("oeConfirmed").checked
      };
      try {
        if (isAdd) {
          await withError(supabaseClient.from("org_verticals").insert({ id: newId(name), sort_order: Date.now() % 100000, ...payload }));
        } else {
          await withError(supabaseClient.from("org_verticals").update(payload).eq("id", id));
        }
        closeModal();
        await onSaved();
      } catch (err) { setError(err.message); }
    });
    if (!isAdd) {
      document.getElementById("oeDelete").addEventListener("click", async () => {
        const funcs = v.funcs || [];
        const msg = funcs.length
          ? `Delete "${v.name}" and its ${funcs.length} job function${funcs.length === 1 ? "" : "s"}? This can't be undone.`
          : `Delete "${v.name}"? This can't be undone.`;
        if (!confirm(msg)) return;
        try {
          if (funcs.length) await withError(supabaseClient.from("org_functions").delete().eq("vertical", id));
          await withError(supabaseClient.from("org_verticals").delete().eq("id", id));
          closeModal();
          await onSaved();
        } catch (err) { setError(err.message); }
      });
    }
  }

  // ---- Function ----
  function openFunction(mode, id, verticalId) {
    const isAdd = mode === "add";
    let func = null, vid = verticalId;
    if (!isAdd) {
      const found = findFunctionEntry(id);
      if (!found) return;
      func = found.func; vid = found.verticalId;
    }
    showModal(formShell(isAdd ? "Add job function" : "Edit job function", "", `
      <label>Department<select id="oeVertical">${verticalOptions(vid)}</select></label>
      <label>Label<input id="oeLabel" value="${isAdd ? "" : esc(func.label)}"></label>
      <label class="oe-checkbox"><input type="checkbox" id="oeConfirmed" ${!isAdd && func.confirmed ? "checked" : ""}> Confirmed (vs. estimated)</label>
    `, { showDelete: !isAdd, deleteLabel: "Delete function" }));
    wireCancelAndClose();
    document.getElementById("oeSave").addEventListener("click", async () => {
      const label = document.getElementById("oeLabel").value.trim();
      if (!label) { setError("Label is required."); return; }
      const payload = { vertical: document.getElementById("oeVertical").value, label, confirmed: document.getElementById("oeConfirmed").checked };
      try {
        if (isAdd) {
          await withError(supabaseClient.from("org_functions").insert({ id: newId(label), sort_order: Date.now() % 100000, ...payload }));
        } else {
          await withError(supabaseClient.from("org_functions").update(payload).eq("id", id));
        }
        closeModal();
        await onSaved();
      } catch (err) { setError(err.message); }
    });
    if (!isAdd) {
      document.getElementById("oeDelete").addEventListener("click", async () => {
        if (!confirm(`Delete "${func.label}"? Any modeled connections to/from it go too. This can't be undone.`)) return;
        try {
          await withError(supabaseClient.from("org_functions").delete().eq("id", id));
          closeModal();
          await onSaved();
        } catch (err) { setError(err.message); }
      });
    }
  }

  // ---- Person ----
  function openPerson(mode, id, defaultParent) {
    const isAdd = mode === "add";
    const p = isAdd ? null : (getData().leadership || []).find(x => x.id === id);
    if (!isAdd && !p) return;
    const divisions = getData().divisions || [];
    const crossSelected = new Set(isAdd ? [] : (p.cross || []));
    showModal(formShell(isAdd ? "Add person" : "Edit person", "", `
      <label>Name<input id="oeName" value="${isAdd ? "" : esc(p.name)}"></label>
      <label>Title<input id="oeTitle" value="${isAdd ? "" : esc(p.title)}"></label>
      <label>Note (optional)<textarea id="oeNote">${isAdd ? "" : esc(p.note)}</textarea></label>
      <label>Reports into<select id="oeParent">${parentOptions(isAdd ? (defaultParent || "root") : p.parent)}</select></label>
      <label>Also connects to (cross-division, optional)</label>
      <div class="oe-checklist">
        ${divisions.map(d => `<label class="oe-checkbox"><input type="checkbox" class="oeCross" value="${d.id}" ${crossSelected.has(d.id) ? "checked" : ""}> ${esc(d.name)}</label>`).join("")}
      </div>
    `, { showDelete: !isAdd, deleteLabel: "Delete person" }));
    wireCancelAndClose();
    document.getElementById("oeSave").addEventListener("click", async () => {
      const name = document.getElementById("oeName").value.trim();
      if (!name) { setError("Name is required."); return; }
      const cross = Array.from(document.querySelectorAll(".oeCross:checked")).map(el => el.value);
      const payload = {
        name, title: document.getElementById("oeTitle").value.trim(),
        note: document.getElementById("oeNote").value.trim(),
        parent: document.getElementById("oeParent").value,
        cross_divisions: cross.length ? cross : null
      };
      try {
        if (isAdd) {
          await withError(supabaseClient.from("org_people").insert({ id: newId(name), sort_order: Date.now() % 100000, ...payload }));
        } else {
          await withError(supabaseClient.from("org_people").update(payload).eq("id", id));
        }
        closeModal();
        await onSaved();
      } catch (err) { setError(err.message); }
    });
    if (!isAdd) {
      document.getElementById("oeDelete").addEventListener("click", async () => {
        if (!confirm(`Remove ${p.name} from the structure? This can't be undone.`)) return;
        try {
          await withError(supabaseClient.from("org_people").delete().eq("id", id));
          closeModal();
          await onSaved();
        } catch (err) { setError(err.message); }
      });
    }
  }

  // ---- Connections (lightweight add/delete list) ----
  async function openConnections() {
    showModal(`<h3>Manage connections</h3><p class="auth-modal-sub">Loading…</p>`);
    const { data: rows, error } = await supabaseClient.from("org_connections").select("*").order("from_id");
    if (error) { showModal(`<h3>Manage connections</h3><div class="oe-error">${esc(error.message)}</div>`); return; }
    renderConnectionsModal(rows);
  }

  function renderConnectionsModal(rows) {
    showModal(`
      <h3>Manage connections</h3>
      <p class="auth-modal-sub">How work actually hands off or overlaps between job functions.</p>
      <div class="oe-conn-list">
        ${rows.length ? rows.map(c => `
          <div class="oe-conn-row">
            <span class="oe-conn-text"><b>${esc(funcLabel(c.from_id))}</b> ${c.type === "handoff" ? "→" : "⇄"} <b>${esc(funcLabel(c.to_id))}</b><br><span class="oe-conn-note">${esc(c.note || "")}</span></span>
            <button class="oe-delete-sm" data-conn-id="${c.id}" type="button">✕</button>
          </div>
        `).join("") : `<p class="oe-empty">None yet.</p>`}
      </div>
      <h4>Add a connection</h4>
      <div class="oe-form">
        <label>From<select id="oeConnFrom">${allFunctionOptions()}</select></label>
        <label>To<select id="oeConnTo">${allFunctionOptions()}</select></label>
        <label>Type<select id="oeConnType"><option value="handoff">Handoff (work passes forward)</option><option value="shared">Shared (same system/data)</option></select></label>
        <label>Note<input id="oeConnNote" placeholder="Why they connect"></label>
        <div class="oe-error" id="oeError"></div>
        <div class="oe-actions">
          <button id="oeConnAdd" class="oe-save" type="button">Add connection</button>
          <button id="oeCancel" class="oe-cancel" type="button">Close</button>
        </div>
      </div>
    `);
    wireCancelAndClose();
    document.querySelectorAll("[data-conn-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Remove this connection?")) return;
        try {
          await withError(supabaseClient.from("org_connections").delete().eq("id", btn.dataset.connId));
          await onSaved();
          openConnections();
        } catch (err) { setError(err.message); }
      });
    });
    document.getElementById("oeConnAdd").addEventListener("click", async () => {
      const from_id = document.getElementById("oeConnFrom").value;
      const to_id = document.getElementById("oeConnTo").value;
      if (from_id === to_id) { setError("From and To must be different functions."); return; }
      try {
        await withError(supabaseClient.from("org_connections").insert({
          from_id, to_id, type: document.getElementById("oeConnType").value,
          note: document.getElementById("oeConnNote").value.trim() || null
        }));
        await onSaved();
        openConnections();
      } catch (err) { setError(err.message); }
    });
  }

  function open(kind, mode, id, parentId) {
    if (kind === "division") { openDivision(id); return; }
    if (kind === "vertical") { openVertical(mode, id, parentId); return; }
    if (kind === "function") { openFunction(mode, id, parentId); return; }
    if (kind === "person") { openPerson(mode, id, parentId); return; }
  }

  async function remove(kind, id) {
    try {
      if (kind === "vertical") {
        const v = (getData().verticals || {})[id];
        if (!v) return;
        const funcs = v.funcs || [];
        const msg = funcs.length
          ? `Delete "${v.name}" and its ${funcs.length} job function${funcs.length === 1 ? "" : "s"}? This can't be undone.`
          : `Delete "${v.name}"? This can't be undone.`;
        if (!confirm(msg)) return;
        if (funcs.length) await withError(supabaseClient.from("org_functions").delete().eq("vertical", id));
        await withError(supabaseClient.from("org_verticals").delete().eq("id", id));
        await onSaved();
      } else if (kind === "function") {
        const found = findFunctionEntry(id);
        const label = found ? found.func.label : id;
        if (!confirm(`Delete "${label}"? Any modeled connections to/from it go too. This can't be undone.`)) return;
        await withError(supabaseClient.from("org_functions").delete().eq("id", id));
        await onSaved();
      } else if (kind === "person") {
        const p = (getData().leadership || []).find(x => x.id === id);
        const name = p ? p.name : id;
        if (!confirm(`Remove ${name} from the structure? This can't be undone.`)) return;
        await withError(supabaseClient.from("org_people").delete().eq("id", id));
        await onSaved();
      }
    } catch (err) {
      alert("Couldn't delete: " + err.message);
    }
  }

  window.OrgEdit = {
    init(getDataFn, onSavedFn) { getData = getDataFn; onSaved = onSavedFn; },
    open, remove, openConnections, close: closeModal
  };

  document.addEventListener("DOMContentLoaded", () => {
    const ov = overlay();
    if (!ov) return;
    document.getElementById("orgEditClose").addEventListener("click", closeModal);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  });
})();
