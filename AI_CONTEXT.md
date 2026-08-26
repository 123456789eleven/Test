# Custodian — context for prompting Claude Code

This file is meant to be pasted into an external Claude chat (or its project knowledge) so it can help draft clear, well-scoped prompts to hand to Claude Code, which does the actual implementation work in this repo. It reflects the real, current state of the project as of 2026-08-25 — keep it updated as things change, rather than letting it go stale like `PLAN.md` did during the React migration.

## What this project is

Custodian is a personal career/industry-intelligence web app the user is building for themselves. The user is a COBRA Administrator I at Kelly Benefits, working toward a management track, and this app is both a real tool (tracking the company's structure, workflows, and their own career context) and a software project they're building hands-on with Claude Code.

- Repo: `123456789eleven/Test`, local clone at `C:\Users\bearf\Documents\COBRA Case Ledger\vested-repo`.
- Live at `https://123456789eleven.github.io/Test/` — but the live site currently serves the OLD pre-React version. All current work happens on the **`react-migration` branch**, not yet merged to `main`. Merging is a deliberate, separate, not-yet-made decision (it's a one-way switch of GitHub Pages' deploy source from "branch" to "GitHub Actions," which only the user can flip).
- For local development/testing, a Vite dev server runs at `http://localhost:5173/#/<route>` (e.g. `#/hologram`).

## Tech stack

- React 19 + Vite 8, plain JS/JSX — **no TypeScript**, deliberate choice.
- `react-router-dom` v7, via `createHashRouter`/`RouterProvider` (the data-router API, not the plain component API — required because the app shell uses `useMatches()`).
- `@tanstack/react-query` for all Supabase reads/writes.
- `@react-three/fiber` + `@react-three/drei` (`three@0.185.1`, `three-stdlib`) for the 3D "Hologram" scene — declarative Three.js, not imperative.
- Supabase (Postgres + Auth) as the backend. Public read / sign-in-gated write on every table (RLS). Schema changes go through the Supabase CLI (`supabase migration new`, `supabase db push`), never hand-pasted SQL.

## Data model (Supabase tables)

- **Org structure**: `org_divisions`, `org_verticals`, `org_functions`, `org_people`, `org_connections`.
- `org_people` — 464 real rows (a real Kelly Benefits org-chart export + public team bios, reconciled, not fabricated). Key columns: `parent` (which of 5 buckets — `root`=Corporate Functions, or one of the 4 real divisions: `strategies`/`advantage`/`payroll`/`advisory`), `manager_id` (real self-referencing reporting line, 442/464 populated, chains up to 7 levels deep), `title_id` (FK to `org_titles`, an 8-rank ladder).
- **Workflow/tooling layer**: `tasks`/`tools`/`task_tools` (function-level capability data), `workflows`/`workflow_steps`/`workflow_transitions` (currently one real workflow: the COBRA administration process, 56 steps, 51 transitions, migrated from `data/cobra-process.json`), `external_stakeholders`/`workflow_stakeholders` (client, qualified beneficiary, carrier, broker).
- A `workflow_steps` row links to a real org node via `task_id` → `tasks.function_id`, or directly via `function_id`, or `stakeholder_id` — in that priority order. **27 of 56 real steps are honestly unresolved** (no fabricated links).

## The Hologram feature (the main focus of recent work)

A full-screen 3D scene (`src/views/Hologram.jsx` + `src/components/hologram/`) visualizing the company's real structure, reporting lines, and the COBRA workflow, plus 2D overlay panels for reading detail.

**Accordion / node hierarchy** (`orgTree.js`, the core pure-logic file — no React/Three.js in it):
- Tier1: the 4 real divisions + Corporate Functions ("corpfn"), always visible.
- Tier2 under a **real division**: two independent, spatially separated sectors — real departments/verticals (Win, Serve, Connect, etc. for Advantage) as the primary sector (box-shaped nodes, distinct uppercase labels), and real people/teams as a secondary sector. Under **corpfn**: only real people (no verticals exist there).
- Tier2 people are **entry points** (real people whose manager is null or outside their own division bucket) — not the full roster. Large groups get clustered: a person with real direct reports becomes its own "Name (team size)" node; solo individual contributors beyond a small threshold collapse into one synthetic "Individual Contributors (N)" node.
- **`personPath`**: arbitrary-depth drill-down state (a plain array of person ids) — clicking an expandable person reveals their real direct reports, one level at a time, reusing the same "one branch open per level" accordion rule as everything else. This is separate from `expandedTier1`/`expandedTier2` (which drive the division→vertical→function path).
- Tier3 under a **vertical**: real job functions (unchanged, simplest/oldest part of the tree).

**2D overlay panels** (rendered on top of the 3D canvas, not pushed below it):
- `PersonCard.jsx` — click a person node (or hit "View profile" on hover for one with reports) to open a profile card: title, manager, direct reports, each clickable to jump to that person's own card — this chain walks the *full* 464-person roster, not just the people who get 3D nodes.
- `WorkflowCard.jsx` — a structured, step-by-step outline of the COBRA workflow (grouped by real owner, with a connecting rail), opened via a "View card" button — complements, doesn't replace, the existing 3D "▶ Play" simulation and "show full path" overlay.
- `WorkflowControls.jsx`/`WorkflowStepInfo.jsx` — the animated workflow-simulation feature: a traveling pulse through real steps, pausing at real decision points for the user to choose a branch.
- `ManagerLines.jsx` — a toggleable overlay drawing real manager→report lines in 3D between currently-visible person nodes.

**Visual design**: a coordinated 3-color-family palette anchored in the app's own Aurora tokens (`src/styles/tokens.css`: `--accent` violet, `--manager` amber) — violet for "real/connected," amber for "hierarchy/emphasis," a distinct warm copper only for external stakeholders, a dark plum-neutral for "no data yet." No new hues added per feature; shape and label styling (not color) differentiate real categories (e.g. box-shaped department nodes vs. octahedron person nodes).

## Design principles this project follows (learned the hard way, across several rounds)

- **Restraint reads as premium; piling on effects reads as cheap.** One accent hue family used consistently beats a different neon color per feature/category. Differentiate via shape, label text, or a small dot — not a new hue.
- No glassmorphism + glow + gradient + pill-everything (the generic "AI SaaS dashboard" look) — the fix is always to *cut* an element that's trying too hard, not add polish around it.
- Never fabricate data to make something look more complete — an honestly unresolved/empty state (e.g. "Not yet linked," "No manager recorded") is always correct over inventing a plausible-looking value.
- Prefer showing the whole real thing over summarizing it — e.g. the workflow card shows real title/description text, not an AI-generated paraphrase.

## Working conventions for a Claude Code session on this repo

- Big/ambiguous changes go through Plan Mode (research → a written plan → explicit approval) before any code is written. Small, clearly-scoped follow-ups on an already-agreed direction should just be implemented directly — **the user has explicitly asked for less back-and-forth ceremony on routine iteration**, reserving Plan Mode for genuinely new directions or real architectural forks.
- After any change: `npm run build` must be clean, and the dev server's console log gets checked for runtime errors.
- **Claude cannot see the 3D scene or judge visual/interaction quality itself** — every visual change needs the user's own eyes in a real browser before it's considered done. Real bugs (a router crash, an oversized effect, a dead CSS rule) have repeatedly only been caught this way, never by a clean build alone.
- Git: work happens on `react-migration`, committed with descriptive messages after each verified change, pushed to origin. Real data/schema changes go through a new Supabase migration file, verified against the live table via a direct REST check (not just trusting the migration's own reported result).
- Decisions and standing preferences get saved to Claude's persistent memory system (not just left in a conversation that will scroll away) — if you tell the assistant something you want remembered across sessions, say so explicitly.

## Tips for writing a good prompt for this project

- Say **which page/feature** (Hologram vs. Company vs. something else) and, if it's visual, attach a screenshot — screenshots have repeatedly caught real bugs that text descriptions alone didn't.
- If something looks "cluttered," "sloppy," or "not professional," it helps to say what specifically bothers you (density? color? a moving element? inconsistent styling between two areas?) — but even a vague reaction is workable, since the assistant will investigate the actual cause rather than guess.
- If you want a structural/architectural change (not just a visual tweak), it's fine to describe the *problem* and let Claude propose the approach — that's what Plan Mode is for.
- Real data always wins over a nicer-looking guess in this project — if a request would require fabricating something (a link, a number, a relationship) that doesn't exist in the real data, expect the assistant to flag that rather than silently inventing it.
