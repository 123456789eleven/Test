# Custodian — Kelly Benefits architecture

This file is the durable reference for how the Kelly Benefits section of Custodian is organized, kept up to date as that shape changes. Custodian's other sections (Overview, Insights, Landscape, Study) are unaffected by everything below.

## One unified page — Hologram

Kelly Benefits is a **single page** (`#/hologram`, `js/views/hologram.js`). This reverses an earlier decision (see History) that deliberately split structure and relationships into two separate pages — that split is retired. Structure and relationships now live in one real WebGL 3D scene:

- **Hierarchy** reads through node depth/size — divisions are the largest nodes, departments mid-sized, job functions smallest, all the same shared shape (a scaled octahedron), positioned deterministically (trig math, no physics/force-directed layout — this project's standing preference).
- **Relationships** read through glowing lines between nodes, driven by real `org_connections` data only. A connection always resolves to whatever tier is currently expanded for each endpoint (function if drilled in, else its department, else its division) — see `resolveVisible()`/`rebuildLines()` in `js/views/hologram.js`. Currently only Advantage has any modeled connections; the other three divisions render visibly dim/quiet rather than having fabricated edges added to look more populated.
- Progressive disclosure (click a division to reveal its departments, click a department to reveal its functions) with accordion behavior — expanding a new branch closes whichever one was open before it at that level, so the scene never accumulates every branch anyone has ever clicked.
- Corporate Functions is a fifth peer node built from real `org_people` rows (`parent = 'root'`), with its real people as the node tier beneath it (no fabricated department structure — it doesn't have one).
- Every other section that used to live on the separate Full Circle/Org Tree pages (Where I Fit, SWOT, division-to-division client flow, the COBRA process card, company snapshot/leadership/history) is now on this same page, around the 3D scene.

Editing (add/edit/delete for divisions, departments, functions, people, connections) happens via hover on a node in the 3D scene — an "Edit" and/or "+ Add" button appears in the floating label, wired to the existing `js/orgedit.js` modal. Divisions are edit-only (no add/delete — matches `orgedit.js`'s own rule, since the four divisions are fixed).

**Client Outcome** is deliberately not a node in the scene — no real client-quality/outcome data exists anywhere in this system to trace toward. It stays a documented absence (with an explanatory caption on the page), not a fabricated metric.

## Data model

**Org structure** (unchanged): `org_divisions`, `org_verticals`, `org_functions`, `org_people`, `org_connections` — 5 tables from the "Foundation" work, public read / sign-in-gated write.

**Workflow/tooling/hierarchy/stakeholder layer** (additive, from the "Schema Extension" work): `org_titles` (rank reference, currently empty — no real title/rank data has been provided yet, don't invent one), `org_people.title_id` (nullable FK to `org_titles`), `tasks`/`tools`/`task_tools` (function-level capability layer — deliberately function-level not person-level, matching how `org_connections` already works), `workflows`/`workflow_steps`/`workflow_transitions` (a generalized version of what `js/cobraprocess.js` already does for COBRA specifically — real branching via `workflow_transitions`, not a forced straight line), `external_stakeholders`/`workflow_stakeholders` (the first place this project represents anything outside Kelly Benefits itself). This layer does not touch `org_connections` or the hologram's rendering — it's a separate, additive layer that could eventually be visualized alongside the 3D scene, not a replacement for anything above.

**COBRA's real process is migrated into this layer**: the existing, real, sourced `data/cobra-process.json` became the first real `workflows` row (plus its `workflow_steps`/`workflow_transitions`/relevant `tasks`/one real `tool` — KTBSonline, named explicitly in the source — and real `external_stakeholders` — Client/Employer, Qualified Beneficiary, Insurance Carrier). **`js/cobraprocess.js`'s rendering was deliberately left untouched** — it still reads `data/cobra-process.json` directly, not the new tables. Migrating the data and rewriting the renderer to be schema-driven were treated as two separate decisions; only the former was done. Don't assume the COBRA process card on the Hologram page is reading from `workflows` — it isn't, yet.

## Editing / shared modules

`js/orgedit.js` is the single shared edit modal, used from the Hologram page's node-hover buttons. `js/orgmap.js` (the old tree renderer) and `js/connectionmap.js` (the old 2D relational graph) still exist as files — `orgmap.js` is currently unused (no page calls `renderOrgMap` anymore); `connectionmap.js`'s `renderConnectionMap` is likewise unused, but its `aggregateConnections`/`findVerticalOf` helpers are still imported by `js/views/hologram.js` via `window.OrgConnections` — don't delete `connectionmap.js` without checking that dependency first.

## History

- **Foundation** (2026-08-06 to 08) — moved the org structure from static JSON into the 5 Supabase tables above, added in-browser add/edit/delete.
- **Connection Map** (2026-08-08 to 09) — replaced a glitchy click-to-reveal line overlay on the org chart with a dedicated department-connections visualization (`js/connectionmap.js`).
- **Full Circle** (2026-08-10) — split the single Kelly Benefits page into two: a relational Full Circle page and a hierarchy Org Tree page, added Corporate Functions and Client Outcome as explicit nodes.
- **Hologram, additive** (2026-08-11) — added a third page, a real WebGL 3D scene, alongside the two from Full Circle (not replacing them yet) — explicitly staged this way so Full Circle/Org Tree stayed as a working fallback while the 3D scene was still being debugged (real click-reliability and connection-visibility bugs were found and fixed in this stage).
- **Hologram, consolidated** (2026-08-11) — Full Circle and Org Tree retired; Hologram became the sole page, absorbing every section from both. Confirmed explicitly after a supplied "project instructions" document stated this merge as already-decided history before it had actually happened — verified against the real repo state rather than silently acting on the document's claim.
- **Schema Extension** (2026-08-11) — added the workflow/tooling/hierarchy/stakeholder layer described above; migrated COBRA's real process into `workflows` as real, non-fabricated data.
