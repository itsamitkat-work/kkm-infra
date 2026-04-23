-- `project_boq_lines_type`: always set. `planned` = contract baseline BOQ;
-- other values = supplementary lines for that domain only.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_boq_lines_type'
  ) then
    create type public.project_boq_lines_type as enum (
      'planned',
      'estimation',
      'measurement',
      'billing'
    );
  end if;
end
$$;

-- Do not `ALTER TYPE ... ADD VALUE 'planned'` here: Postgres forbids using a new
-- enum label in the same transaction (55P04). Upgrades use 20260431120000 then
-- 20260431120100.

alter table public.project_boq_lines
  add column if not exists project_boq_lines_type public.project_boq_lines_type;

update public.project_boq_lines
set project_boq_lines_type = 'planned'::public.project_boq_lines_type
where project_boq_lines_type is null;

alter table public.project_boq_lines
  alter column project_boq_lines_type
  set default 'planned'::public.project_boq_lines_type;

alter table public.project_boq_lines
  alter column project_boq_lines_type
  set not null;

comment on type public.project_boq_lines_type is
  'planned = contract baseline BOQ row; other values = supplementary line for that domain.';

comment on column public.project_boq_lines.project_boq_lines_type is
  'planned: core planned BOQ. estimation / measurement / billing: supplementary line for that domain only.';

create index if not exists project_boq_lines_project_type_idx
  on public.project_boq_lines (project_id, project_boq_lines_type);
