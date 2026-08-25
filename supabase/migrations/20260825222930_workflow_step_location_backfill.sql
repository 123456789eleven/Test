-- Workflow-step location backfill, for the animated workflow-simulation feature.
--
-- Adds two nullable columns to workflow_steps so a step can resolve to a real
-- place in the 3D scene without forcing everything through the existing
-- task_id -> tasks.function_id path (which only ever covers steps that are a
-- distinct named capability-action, not every step that merely "happens at"
-- a function or an external party).
--
-- Resolution order once this lands: task_id -> tasks.function_id (existing,
-- 22 of 56 steps) -> function_id (new, direct) -> stakeholder_id (new,
-- external) -> unresolved.
--
-- Backfill is deliberately small and honest: of the 34 steps with no task_id,
-- only 7 get a new link here. The other 27 stay unresolved on purpose --
-- 15 are decision points (their real content is the branch itself, not a
-- location), 3 are "Responsibility: N/A" steps with no real actor, 4 are
-- phase-transition/loop markers with no actor at all, and 5 name a
-- genuinely conditional responsibility ("Client/broker", "Dedicated service
-- or Implementation", etc.) that a single FK can't honestly represent.
-- No new external_stakeholders rows are created -- the 4 real ones
-- (stake-client, stake-beneficiary, stake-carrier, stake-broker) already
-- exist from the earlier Schema Extension work and are exactly what's
-- needed here.

alter table workflow_steps add column if not exists function_id text references org_functions(id);
alter table workflow_steps add column if not exists stakeholder_id text references external_stakeholders(id);

-- Clean, single-actor matches to a real external stakeholder --
-- "Responsibility: Client" / "Responsibility: Qualified beneficiary" with no
-- "or"/compound qualifier.
update workflow_steps set stakeholder_id = 'stake-client' where id in ('p2s1', 'p5s8');
update workflow_steps set stakeholder_id = 'stake-beneficiary' where id in ('p3s1', 'p4s2', 'p5s11');

-- Clean, contextual matches to a real org_function -- both steps are deep in
-- the COBRA-specific termination-date phase (p6, "Kelly Benefits updates to
-- match the termination date approved by the carrier"), described only as
-- "Enrollment team" but unambiguous in context: this is COBRA coverage
-- record maintenance, which is exactly what connect-cobra ("COBRA
-- administration") already represents -- not general new-hire enrollment
-- setup (construct-enrollment-setup), which is a different real function.
update workflow_steps set function_id = 'connect-cobra' where id in ('p6s5', 'p6s6');

-- Verification: expect 29 of 56 steps resolved (22 via task_id, 7 via the
-- two new columns), 27 unresolved, 15 of those unresolved being real
-- decision points (by design, not a gap).
select
  count(*) filter (where task_id is not null) as via_task,
  count(*) filter (where task_id is null and function_id is not null) as via_function,
  count(*) filter (where task_id is null and function_id is null and stakeholder_id is not null) as via_stakeholder,
  count(*) filter (where task_id is null and function_id is null and stakeholder_id is null) as unresolved,
  count(*) filter (where task_id is null and function_id is null and stakeholder_id is null and is_decision_point) as unresolved_decision_points
from workflow_steps;
