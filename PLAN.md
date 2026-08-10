# Custodian — Kelly Benefits architecture: "Full Circle"

This file is the durable reference for how the Kelly Benefits section of Custodian is organized, kept up to date as that shape changes. Custodian's other sections (Overview, Insights, Landscape, Study) are unaffected by everything below.

## The core distinction — two pages, never merged

Kelly Benefits is presented as **two structurally separate pages**, because they answer two different questions:

- **Full Circle** (`#/full-circle`, `js/views/fullcircle.js`) — *how the organization functions as a connected whole.* A relational/network view: divisions, Corporate Functions, and a Client Outcome node as top-level nodes, with department- and function-level connections between them. This is the primary/anchor page.
- **Org Tree** (`#/org-tree`, `js/views/orgtree.js`) — *how the organization is structured.* A strict hierarchy: who reports to whom, divisions → departments → job functions. A reference page, not the relational model.

**Rule: tree-rendering logic and relational logic never merge**, even though both pages read from the same underlying Supabase tables. Each page has its own data-fetching function. Don't "simplify" this into a shared loader later without re-reading this file first.

## Data model

Both pages read the same 5 Supabase tables (`org_divisions`, `org_verticals`, `org_functions`, `org_people`, `org_connections` — schema and RLS documented in the "Foundation" project work; public read, sign-in-gated write). No new tables were added for Full Circle. Two concepts exist only at the JS/rendering layer, not as persisted data:

- **Corporate Functions** is treated as a fifth peer node in Full Circle, built from `org_people` rows where `parent = 'root'`. It has no departments or job functions of its own in the data — none are fabricated. If that structure turns out to be real, add it to `org_verticals`/`org_functions` properly rather than hardcoding it.
- **Client Outcome** is a placeholder node with no backing data anywhere in this system. It's shown because "every division traces to it" is the point of Full Circle conceptually, but it's explicitly labeled as not yet tracked. Do not attach real-looking numbers to it until an actual metric (client satisfaction, retention, escalation rate, etc.) is wired up.

## Editing

`js/orgedit.js` (add/edit/delete for divisions, departments, functions, people, connections) is shared by both pages unchanged — it operates on the Supabase tables directly and doesn't care which page triggered it. `js/orgmap.js` (the tree renderer) and `js/connectionmap.js` (the relational graph renderer) are also shared, reusable rendering modules — extend them in place rather than forking, but respect the boundary above: `orgmap.js` stays hierarchy-only, `connectionmap.js` stays relationship-only.

## History

- **Foundation** (2026-08-06 to 08) — moved the org structure from static JSON into the 5 Supabase tables above, added in-browser add/edit/delete.
- **Connection Map** (2026-08-08 to 09) — replaced a glitchy click-to-reveal line overlay on the org chart with a dedicated department-connections visualization (`js/connectionmap.js`).
- **Full Circle** (2026-08-10) — this reframing: split the single Kelly Benefits page into the two pages described above, added Corporate Functions and Client Outcome as explicit nodes in the relational view.
