async function migrateLocalNotesIfNeeded() {
  if (localStorage.getItem("custodianMigrated") === "true") return;

  const notes = (() => { try { return JSON.parse(localStorage.getItem("custodianNotes")) || []; } catch { return []; } })();
  const fit = localStorage.getItem("custodianFit") || "";

  const fieldNotes = notes.filter(n => n.page === "landscape").map(n => ({
    page: "landscape",
    type: n.type || "observation",
    related: n.related || null,
    body: n.text || "",
    created_at: n.date ? new Date(n.date).toISOString() : new Date().toISOString()
  }));
  const workbenchItems = notes.filter(n => n.page === "company").map(n => ({
    related: n.related || null,
    impact: n.impact || "med",
    effort: n.effort || "med",
    status: n.status || "idea",
    body: n.text || "",
    created_at: n.date ? new Date(n.date).toISOString() : new Date().toISOString()
  }));

  if (fieldNotes.length) await supabaseClient.from("field_notes").insert(fieldNotes);
  if (workbenchItems.length) await supabaseClient.from("workbench_items").insert(workbenchItems);
  if (fit.trim()) await supabaseClient.from("site_text").upsert({ key: "fit", content: fit });

  localStorage.setItem("custodianMigrated", "true");
  window.dispatchEvent(new CustomEvent("custodian:migrated"));
}
