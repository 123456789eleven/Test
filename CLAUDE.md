# Custodian — Claude Code project memory

## What this project is

Custodian is a personal career/industry-intelligence web app for the user, who is a COBRA Administrator I at Kelly Benefits, working toward a management track. It's both a real internal tool (tracking the company's structure, workflows, and their own career context) and a software project built hands-on with Claude Code.

- Repo: `123456789eleven/Test`, local clone at `C:\Users\bearf\Documents\COBRA Case Ledger\vested-repo`.
- Live at `https://123456789eleven.github.io/Test/` — but the live site currently serves the OLD pre-React version. All current work happens on the **`react-migration` branch**, not yet merged to `main`. Merging is a deliberate, separate, not-yet-made decision.
- Local dev server: `http://localhost:5173/#/<route>` (e.g. `#/hologram`).

## Tech stack

- React 19 + Vite 8, plain JS/JSX — no TypeScript, deliberate choice.
- `react-router-dom` v7 via `createHashRouter`/`RouterProvider` (data-router API, required by `useMatches()`).
- `@tanstack/react-query` for all Supabase reads/writes.
- `@react-three/fiber` + `@react-three/drei` (`three@0.185.1`, `three-stdlib`) for the 3D "Hologram" scene — declarative Three.js, not imperative.
- Supabase (Postgres + Auth) backend. Public read / sign-in-gated write (RLS). Schema changes go through the Supabase CLI, never hand-pasted SQL.

## Data model (Supabase tables)

- **Org structure**: `org_divisions`, `org_verticals`, `org_functions`, `org_people`, `org_connections`.
- `org_people` — 464 real rows, reconciled from a real org-chart export + public bios, not fabricated. Key columns: `parent` (root/strategies/advantage/payroll/advisory), `manager_id` (real reporting line, 442/464 populated, up to 7 levels deep), `title_id` (FK to `org_titles`, an 8-rank ladder).
- **Workflow layer**: `tasks`/`tools`/`task_tools`, `workflows`/`workflow_steps`/`workflow_transitions` (one real workflow so far: COBRA administration, 56 steps, 51 transitions), `external_stakeholders`/`workflow_stakeholders`.
- A `workflow_steps` row links to org nodes via `task_id` → `tasks.function_id`, or `function_id`, or `stakeholder_id`, in that priority order. 27 of 56 real steps are honestly unresolved — no fabricated links.

## The Hologram feature

A full-screen 3D scene (`src/views/Hologram.jsx` + `src/components/hologram/`) visualizing the real org structure, reporting lines, and the COBRA workflow, plus 2D overlay panels for detail.

- `orgTree.js` — core pure-logic accordion/hierarchy file, no React/Three.js in it.
- Tier1: 4 real divisions + Corporate Functions ("corpfn"), always visible.
- Tier2 under a real division: verticals (primary sector, box-shaped nodes) + people (secondary sector). Under corpfn: people only.
- Tier2 people are entry points (manager null or outside their division); large groups cluster into "Name (team size)" or synthetic "Individual Contributors (N)" nodes.
- `personPath` — arbitrary-depth drill-down state for clicking into direct reports, separate from `expandedTier1`/`expandedTier2`.
- Tier3 under a vertical: real job functions.
- `PersonCard.jsx` — profile card on click, walks the full 464-person roster.
- `WorkflowCard.jsx` — structured COBRA workflow outline, grouped by real owner.
- `WorkflowControls.jsx`/`WorkflowStepInfo.jsx` — animated workflow simulation with branch choices at decision points.
- `ManagerLines.jsx` — toggleable 3D manager→report line overlay.
- **Visual palette**: violet (`--accent`, real/connected), amber (`--manager`, hierarchy/emphasis), copper (external stakeholders only), dark plum-neutral (no data yet). No new hues per feature — differentiate via shape/label, not color.

## Design principles (learned the hard way, across several rounds)

- Restraint reads as premium; piling on effects reads as cheap. One consistent accent-hue family beats a different color per feature.
- No glassmorphism + glow + gradient + pill-everything ("generic AI SaaS dashboard" look) — the fix is always to cut, not to polish around it.
- Never fabricate data to look more complete — an honest empty state ("Not yet linked," "No manager recorded") beats a plausible invented value.
- Prefer showing the real thing over summarizing it — e.g. the workflow card shows real title/description text, not an AI paraphrase.

## Visual verification protocol (added after two consecutive false "done" reports on the Hologram overhaul)

- A clean build is never sufficient evidence that a visual or render change works. Runtime behavior must be independently confirmed before anything is reported done.
- Before reporting any visual/graphics change as complete: push the effect to an obviously extreme value, confirm — via console log or an exact description of what to look for — that it is visibly, unmistakably active, then dial back to the intended value.
- Multi-part visual changes (new post-processing, new materials, camera behavior, layout/spacing) get verified in small increments with a checkpoint after each individual change, not batched into one commit and reported as a single "done."
- If a change could plausibly affect camera distance, node layout, or label rendering as a side effect, state that explicitly before reporting — these regress silently and a build check will not catch them.
- The user cannot see the 3D scene or judge visual/interaction quality without opening a browser themselves. Every visual round ends with the user checking it in a real browser before it's considered done — say specifically what to look for, don't just ask "what do you think."

## Quick reference (read this before re-discovering things the slow way)

- Dev server: `npm run dev` → `http://localhost:5173/#/<route>`. Build check: `npm run build`.
- Key files by feature: org/accordion logic → `orgTree.js` (pure, no React/Three.js). Person detail → `PersonCard.jsx`. Workflow outline → `WorkflowCard.jsx`. Workflow simulation → `WorkflowControls.jsx`/`WorkflowStepInfo.jsx`. Manager-line overlay → `ManagerLines.jsx`. Palette tokens → `src/styles/tokens.css`.
- Schema changes: `supabase migration new <name>`, then `supabase db push`. Never hand-paste SQL into the dashboard. Verify against the live table via a direct REST check afterward, not just the migration's own reported result.
- Don't re-litigate settled decisions already recorded in this file (no TypeScript, data-router API for `react-router-dom`, one coordinated palette, real-data-only). If a task seems to require reopening one of these, flag it explicitly rather than quietly deciding either way.
- End-of-turn change summary: every response that edits files ends with a short list of exactly which files changed and what changed in each — not just "done." This is required whether or not the user is watching the diff live, since it's the fastest way to catch a mismatch between what was intended and what actually got written.

## Teaching mode (this project is explicitly a learning vehicle, not just a deliverable)

The user is building this hands-on to deepen both software engineering skill and Kelly Benefits / HR-industry domain knowledge — efficiency in getting features shipped matters, but so does the user actually understanding why each decision was made. Default to explaining, don't wait to be asked:

- When you make a non-trivial technical choice (a library, a pattern, a tradeoff), say briefly *why* that option over the alternatives — one or two sentences is enough, this isn't a lecture, but "I used X because Y" beats a silent diff.
- When a bug's root cause is a broader pattern (like a render-loop wiring gap between declarative and imperative post-processing APIs), name the pattern, not just the fix — so it's recognizable next time without Claude Code needed.
- When a change touches the real Kelly Benefits data model (org structure, COBRA workflow), it's fine to note what that reflects about how the business actually works, if relevant — this app doubles as the user's own reference material for the industry.
- Don't pad routine, obvious changes with unnecessary explanation — save it for the moments where there's actually something worth understanding.

## Working conventions

- Big/ambiguous changes go through Plan Mode (research → written plan → explicit approval) before any code. Small, clearly-scoped follow-ups on an already-agreed direction get implemented directly — less back-and-forth ceremony on routine iteration, Plan Mode reserved for genuinely new directions or architectural forks.
- After any change: `npm run build` must be clean, AND the dev server's console log gets checked for runtime errors. Clean build alone is not "done" — see the verification protocol above.
- Git: work happens on `react-migration`, committed with descriptive messages after each verified change, pushed to origin. Schema changes go through a new Supabase migration file, verified against the live table via a direct REST check, not just the migration's own reported result.
- Decisions and standing preferences get saved here in `CLAUDE.md`, not left in a conversation that will scroll away.

## Tips for writing a good prompt for this project

- Say which page/feature (Hologram vs. Company vs. something else) and, if visual, attach a screenshot.
- If something looks "cluttered," "sloppy," or "not professional," say what specifically bothers you if you can (density? color? motion? inconsistent styling?) — but even a vague reaction is workable.
- For a structural/architectural change, describing the problem and letting Claude Code propose the approach is fine — that's what Plan Mode is for.
- Real data always wins over a nicer-looking guess — if a request would require fabricating a link, number, or relationship that doesn't exist in the real data, expect it to be flagged rather than silently invented.
