alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."external_stakeholders" (
  "id"          text not null,
  "name"        text not null,
  "type"        text,
  "description" text,
  constraint "external_stakeholders_pkey" primary key (id)
);

alter table "public"."external_stakeholders"
  enable row level security;

create table "public"."field_notes" (
  "id"         uuid                     not null default gen_random_uuid(),
  "page"       text                     not null,
  "type"       text                     not null,
  "related"    text,
  "body"       text                     not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "field_notes_pkey" primary key (id)
);

alter table "public"."field_notes"
  enable row level security;

create table "public"."org_connections" (
  "id"      uuid not null default gen_random_uuid(),
  "from_id" text not null,
  "to_id"   text not null,
  "type"    text not null,
  "note"    text,
  constraint "org_connections_pkey" primary key (id),
  constraint "org_connections_type_check" check ((type = ANY (ARRAY['handoff'::text, 'shared'::text])))
);

alter table "public"."org_connections"
  enable row level security;

create table "public"."org_divisions" (
  "id"          text    not null,
  "name"        text,
  "role"        text,
  "desc"        text,
  "scale"       text,
  "unit"        text,
  "caption"     text,
  "competitors" jsonb,
  "sort_order"  integer not null,
  constraint "org_divisions_pkey" primary key (id)
);

alter table "public"."org_divisions"
  enable row level security;

create table "public"."org_functions" (
  "id"         text    not null,
  "vertical"   text    not null,
  "label"      text,
  "confirmed"  boolean not null default false,
  "sort_order" integer not null,
  constraint "org_functions_pkey" primary key (id)
);

alter table "public"."org_functions"
  enable row level security;

create table "public"."org_people" (
  "id"              text    not null,
  "name"            text,
  "title"           text,
  "note"            text,
  "parent"          text    not null,
  "cross_divisions" text[],
  "sort_order"      integer not null,
  "title_id"        text,
  constraint "org_people_pkey" primary key (id)
);

alter table "public"."org_people"
  enable row level security;

create table "public"."org_titles" (
  "id"    text    not null,
  "label" text    not null,
  "rank"  integer not null,
  constraint "org_titles_pkey" primary key (id)
);

alter table "public"."org_titles"
  enable row level security;

create table "public"."org_verticals" (
  "id"         text    not null,
  "division"   text    not null,
  "name"       text,
  "desc"       text,
  "confirmed"  boolean not null default false,
  "sort_order" integer not null,
  constraint "org_verticals_pkey" primary key (id)
);

alter table "public"."org_verticals"
  enable row level security;

create table "public"."site_text" (
  "key"        text                     not null,
  "content"    text                     not null default ''::text,
  "updated_at" timestamp with time zone not null default now(),
  constraint "site_text_pkey" primary key (key)
);

alter table "public"."site_text"
  enable row level security;

create table "public"."task_tools" (
  "task_id" text not null,
  "tool_id" text not null,
  constraint "task_tools_pkey" primary key (task_id, tool_id)
);

alter table "public"."task_tools"
  enable row level security;

create table "public"."tasks" (
  "id"          text not null,
  "name"        text not null,
  "description" text,
  "function_id" text not null,
  constraint "tasks_pkey" primary key (id)
);

alter table "public"."tasks"
  enable row level security;

create table "public"."tools" (
  "id"       text not null,
  "name"     text not null,
  "category" text,
  "vendor"   text,
  constraint "tools_pkey" primary key (id)
);

alter table "public"."tools"
  enable row level security;

create table "public"."workbench_items" (
  "id"         uuid                     not null default gen_random_uuid(),
  "related"    text,
  "impact"     text                     not null default 'med'::text,
  "effort"     text                     not null default 'med'::text,
  "status"     text                     not null default 'idea'::text,
  "body"       text                     not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "workbench_items_pkey" primary key (id)
);

alter table "public"."workbench_items"
  enable row level security;

create table "public"."workflow_stakeholders" (
  "workflow_id"    text not null,
  "stakeholder_id" text not null,
  "role_note"      text,
  constraint "workflow_stakeholders_pkey" primary key (workflow_id, stakeholder_id)
);

alter table "public"."workflow_stakeholders"
  enable row level security;

create table "public"."workflow_steps" (
  "id"                text    not null,
  "workflow_id"       text    not null,
  "step_order"        integer not null,
  "title"             text    not null,
  "description"       text,
  "task_id"           text,
  "is_decision_point" boolean not null default false,
  constraint "workflow_steps_pkey" primary key (id)
);

alter table "public"."workflow_steps"
  enable row level security;

create table "public"."workflow_transitions" (
  "id"              uuid not null default gen_random_uuid(),
  "from_step_id"    text not null,
  "to_step_id"      text not null,
  "condition_label" text,
  constraint "workflow_transitions_pkey" primary key (id)
);

alter table "public"."workflow_transitions"
  enable row level security;

create table "public"."workflows" (
  "id"                  text    not null,
  "name"                text    not null,
  "trigger_description" text,
  "outcome_description" text,
  "owner_function_id"   text,
  "is_external"         boolean not null default false,
  constraint "workflows_pkey" primary key (id)
);

alter table "public"."workflows"
  enable row level security;

alter table "public"."org_connections"
  add constraint "org_connections_from_id_fkey" foreign key (from_id) references public.org_functions(id) on delete cascade;

alter table "public"."org_connections"
  add constraint "org_connections_to_id_fkey" foreign key (to_id) references public.org_functions(id) on delete cascade;

alter table "public"."org_people"
  add constraint "org_people_title_id_fkey" foreign key (title_id) references public.org_titles(id);

alter table "public"."org_verticals"
  add constraint "org_verticals_division_fkey" foreign key (division) references public.org_divisions(id);

alter table "public"."org_functions"
  add constraint "org_functions_vertical_fkey" foreign key (vertical) references public.org_verticals(id);

alter table "public"."tasks"
  add constraint "tasks_function_id_fkey" foreign key (function_id) references public.org_functions(id);

alter table "public"."task_tools"
  add constraint "task_tools_task_id_fkey" foreign key (task_id) references public.tasks(id) on delete cascade;

alter table "public"."task_tools"
  add constraint "task_tools_tool_id_fkey" foreign key (tool_id) references public.tools(id) on delete cascade;

alter table "public"."workflow_stakeholders"
  add constraint "workflow_stakeholders_stakeholder_id_fkey" foreign key (stakeholder_id) references public.external_stakeholders(id) on delete cascade;

alter table "public"."workflow_steps"
  add constraint "workflow_steps_task_id_fkey" foreign key (task_id) references public.tasks(id);

alter table "public"."workflow_transitions"
  add constraint "workflow_transitions_from_step_id_fkey" foreign key (from_step_id) references public.workflow_steps(id) on delete cascade;

alter table "public"."workflow_transitions"
  add constraint "workflow_transitions_to_step_id_fkey" foreign key (to_step_id) references public.workflow_steps(id) on delete cascade;

alter table "public"."workflows"
  add constraint "workflows_owner_function_id_fkey" foreign key (owner_function_id) references public.org_functions(id);

alter table "public"."workflow_stakeholders"
  add constraint "workflow_stakeholders_workflow_id_fkey" foreign key (workflow_id) references public.workflows(id) on delete cascade;

alter table "public"."workflow_steps"
  add constraint "workflow_steps_workflow_id_fkey" foreign key (workflow_id) references public.workflows(id) on delete cascade;

create policy "auth write external_stakeholders" on "public"."external_stakeholders"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read external_stakeholders" on "public"."external_stakeholders"
  for select
  to PUBLIC
  using (true);

create policy "auth delete field_notes" on "public"."field_notes"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert field_notes" on "public"."field_notes"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update field_notes" on "public"."field_notes"
  for update
  to "authenticated"
  using (true);

create policy "public read field_notes" on "public"."field_notes"
  for select
  to PUBLIC
  using (true);

create policy "auth delete org_connections" on "public"."org_connections"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert org_connections" on "public"."org_connections"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update org_connections" on "public"."org_connections"
  for update
  to "authenticated"
  using (true);

create policy "public read org_connections" on "public"."org_connections"
  for select
  to PUBLIC
  using (true);

create policy "auth delete org_divisions" on "public"."org_divisions"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert org_divisions" on "public"."org_divisions"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update org_divisions" on "public"."org_divisions"
  for update
  to "authenticated"
  using (true);

create policy "public read org_divisions" on "public"."org_divisions"
  for select
  to PUBLIC
  using (true);

create policy "auth delete org_functions" on "public"."org_functions"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert org_functions" on "public"."org_functions"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update org_functions" on "public"."org_functions"
  for update
  to "authenticated"
  using (true);

create policy "public read org_functions" on "public"."org_functions"
  for select
  to PUBLIC
  using (true);

create policy "auth delete org_people" on "public"."org_people"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert org_people" on "public"."org_people"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update org_people" on "public"."org_people"
  for update
  to "authenticated"
  using (true);

create policy "public read org_people" on "public"."org_people"
  for select
  to PUBLIC
  using (true);

create policy "auth write org_titles" on "public"."org_titles"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read org_titles" on "public"."org_titles"
  for select
  to PUBLIC
  using (true);

create policy "auth delete org_verticals" on "public"."org_verticals"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert org_verticals" on "public"."org_verticals"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update org_verticals" on "public"."org_verticals"
  for update
  to "authenticated"
  using (true);

create policy "public read org_verticals" on "public"."org_verticals"
  for select
  to PUBLIC
  using (true);

create policy "auth insert site_text" on "public"."site_text"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update site_text" on "public"."site_text"
  for update
  to "authenticated"
  using (true);

create policy "public read site_text" on "public"."site_text"
  for select
  to PUBLIC
  using (true);

create policy "auth write task_tools" on "public"."task_tools"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read task_tools" on "public"."task_tools"
  for select
  to PUBLIC
  using (true);

create policy "auth write tasks" on "public"."tasks"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read tasks" on "public"."tasks"
  for select
  to PUBLIC
  using (true);

create policy "auth write tools" on "public"."tools"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read tools" on "public"."tools"
  for select
  to PUBLIC
  using (true);

create policy "auth delete workbench_items" on "public"."workbench_items"
  for delete
  to "authenticated"
  using (true);

create policy "auth insert workbench_items" on "public"."workbench_items"
  for insert
  to "authenticated"
  with check (true);

create policy "auth update workbench_items" on "public"."workbench_items"
  for update
  to "authenticated"
  using (true);

create policy "public read workbench_items" on "public"."workbench_items"
  for select
  to PUBLIC
  using (true);

create policy "auth write workflow_stakeholders" on "public"."workflow_stakeholders"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read workflow_stakeholders" on "public"."workflow_stakeholders"
  for select
  to PUBLIC
  using (true);

create policy "auth write workflow_steps" on "public"."workflow_steps"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read workflow_steps" on "public"."workflow_steps"
  for select
  to PUBLIC
  using (true);

create policy "auth write workflow_transitions" on "public"."workflow_transitions"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read workflow_transitions" on "public"."workflow_transitions"
  for select
  to PUBLIC
  using (true);

create policy "auth write workflows" on "public"."workflows"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "public read workflows" on "public"."workflows"
  for select
  to PUBLIC
  using (true);

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."external_stakeholders" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."field_notes" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_connections" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_divisions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_functions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_people" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_titles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."org_verticals" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."site_text" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."task_tools" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."tasks" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."tools" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workbench_items" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workflow_stakeholders" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workflow_steps" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workflow_transitions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workflows" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

