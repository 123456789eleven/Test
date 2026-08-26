---
name: workflow-buildout
description: Turn a real, sourced Kelly Benefits business-process document into a real workflow in Supabase (workflows/workflow_steps/workflow_transitions), linked to real org_functions/tasks/external_stakeholders wherever the source honestly supports it, so it's immediately playable in the Hologram scene's workflow simulation. Use this whenever the user wants to add a new process (open enrollment, new client onboarding, payroll setup, etc.) to Custodian, or wants to build out/complete an existing one like COBRA further.
---

# Workflow buildout

This captures the exact methodology used to migrate Kelly Benefits' real COBRA administration process into Supabase — so it can be repeated for any other real, sourced business process without re-deriving the approach each time. It is a data-migration + linkage discipline, not a code-writing task: if the Hologram scene's workflow simulation (`useWorkflowSimulation`, `WorkflowPulse`, `WorkflowMap`, `WorkflowControls`) already exists, **no new frontend code is needed per workflow** — it was built generically against the `workflows` table, and a new real row there is playable immediately.

## Prerequisite: a real source document

This only works from something real — a document, transcript, or detailed description of how the process *actually* runs at Kelly Benefits today, with real phase/step structure, real decision points, and (ideally) real information about who's responsible for each step. `data/cobra-process.json` (or, on the `react-migration` branch, `public/data/cobra-process.json`) is the reference example — read it before starting a new one, to see the shape a good source takes: `phases[].steps[]`, each step either `{type:"process", text, responsibility, time, role?}` or `{type:"decision", text, branches:[{label, steps:[...]}]}` (recursive).

If the user hands you something less structured (a rough description, a bullet list, a person's verbal walkthrough), your first job is asking clarifying questions until you have real phase/step/decision/responsibility detail — never invent steps, branches, or responsibility text to fill gaps. If a real step's responsibility or branch condition genuinely isn't known, say so and leave it out rather than guessing.

## Step 1 — Model the process (if not already in a structured form)

Turn the source into `phases[].steps[]` shape (matching `cobra-process.json`) if it isn't already structured that way. Every step is either a `process` step (something that happens) or a `decision` step (a real branch point with 2+ real outcomes, each leading to further steps). Don't create a decision step for something that only has one real path forward — that's just a process step.

## Step 2 — Create the `workflows` row

One row: `id` (a short slug, e.g. `wf-open-enrollment`), `name` (real, human name), `trigger_description` (what real event starts this process), `outcome_description` (what real end-state it produces), `owner_function_id` (nullable — the real `org_functions.id` that owns this process overall, if there's a clean single owner; leave null if ownership is genuinely shared/unclear), `is_external` (true if the process is client/beneficiary-facing the way COBRA is).

## Step 3 — Create `workflow_steps` rows

One row per real step, in real process order. `id` convention: `p{phase}s{step}` (matches COBRA's `p1s1`...`p6s7`). `step_order`: sequential across the *whole* process, not reset per phase. `title`: the real step text. `description`: free text — COBRA's convention was `"Responsibility: X · Time: Y"`, worth reusing if the source has that shape, but match whatever the real source actually gives you. `is_decision_point`: true only for a step with a real branch (2+ outcomes) — confirmed during COBRA's build that this should be judged by *actual recorded transition count*, not a label alone: a step can be conceptually a "decision" in the source text but have only one real documented path forward (the other branch is a dead end with nothing further specified) — that's `is_decision_point: false` in practice, since `useWorkflowSimulation.js`'s pause-and-wait behavior is driven by real branch count, not this flag.

## Step 4 — Create `workflow_transitions` rows

One row per real step-to-step connection: `from_step_id`, `to_step_id`, `condition_label` (nullable — only set on real branches, using the source's actual branch label text, e.g. "Elects COBRA coverage" / "Does not elect"). **Only create a transition where the source explicitly draws that connection.** Do not fabricate a connecting edge between two steps just because they seem adjacent — COBRA's migration deliberately left several steps without a fabricated incoming edge where the source presented them as siblings under a decision tree without explicitly wiring them together. If a step has no further real transition recorded (a true dead end — "no further action", the process genuinely stops here), leave it with zero outgoing transitions; `useWorkflowSimulation` already treats that as a real, honest "done" state, not a bug to route around.

## Step 5 — Link steps to real locations (the part that makes the animation meaningful)

This is the step that was missing for months on COBRA and is easy to skip — don't skip it, an unlinked workflow just sits at "unresolved" for every step and the pulse has nowhere real to go. For each step, in this priority order:

1. **`task_id`** (existing FK to `tasks`) — only if the step represents a genuinely distinct, reusable capability-action worth its own `tasks` row (COBRA ended up with 6: send notices, process premiums, enroll coverage, terminate for non-payment, generate bill, process renewal — not one task per step). Query real `org_functions` first (`select id, label from org_functions`) and only create a `tasks` row pointing at a function that's a real, honest match — never invent a function label to have something to point at.
2. **`function_id`** (direct FK to `org_functions`, added to `workflow_steps` specifically so not every step needs a `tasks` row) — for a step that happens at a real function but isn't its own distinct task.
3. **`stakeholder_id`** (FK to `external_stakeholders`) — for a step whose real responsibility is an external party (client, carrier, broker, qualified beneficiary, or a new real external actor this process introduces — check the existing 4 rows first, only add a new one if the source genuinely names an external party not already covered).
4. **Leave `null` on all three** — genuinely honest, not a gap to feel bad about — when: the step is a decision point (its real content is the branch, not a location), the responsibility is "N/A"/"system generated" (no real actor), the responsibility is compound/conditional ("X or Y depending on pod/group size", "X and Y" for different sub-parts of one step), or the responsibility names a role matching multiple real people with no way to pick one. Forcing a single FK onto any of these is fabrication, not a shortcut.

Cross-check the real `description`/responsibility text against real `org_functions.label` values and real `external_stakeholders` rows before deciding — don't pattern-match from memory, actually query them (`select id, label from org_functions`, `select id, name, type from external_stakeholders`).

## Step 6 — Migrate it

This project's Supabase schema changes go through the CLI, not manual SQL-editor pasting (see `PLAN.md`'s "Database automation" section): `supabase migration new <name>`, write the SQL (inserts for `workflows`/`workflow_steps`/`workflow_transitions`, any new `tasks`/`external_stakeholders` rows genuinely needed), `supabase db push --dry-run` to check it, then for real.

## Step 7 — Verify, independently, the same way every other migration this project has done

Don't trust the SQL editor's own reported result. After pushing, run direct Supabase REST `count=exact` checks (same pattern as the COBRA backfill): total steps, how many resolved via `task_id`, how many via `function_id`, how many via `stakeholder_id`, how many genuinely unresolved — and for the unresolved ones, confirm *why* (decision point / no real actor / compound responsibility), so the honest gaps are understood, not just present.

## Step 8 — Confirm it's actually playable

`useWorkflows()` (in `src/components/hologram/orgQueries.js`) already fetches every real `workflows` row unfiltered — a new one just appears in `WorkflowControls`' picker list with zero frontend changes. Load the Hologram page and confirm the new workflow shows up and plays. If it doesn't, the bug is almost certainly in the data (a step or transition that doesn't resolve, a `workflow_id` typo) rather than the simulation code, which was built generically against this exact schema.
