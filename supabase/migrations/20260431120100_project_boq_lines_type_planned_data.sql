-- Runs after 20260431120000 so `planned` is usable (separate transaction).

update public.project_boq_lines
set project_boq_lines_type = 'planned'::public.project_boq_lines_type
where project_boq_lines_type is null;

alter table public.project_boq_lines
  alter column project_boq_lines_type
  set default 'planned'::public.project_boq_lines_type;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_boq_lines'
      and column_name = 'project_boq_lines_type'
      and is_nullable = 'YES'
  ) then
    alter table public.project_boq_lines
      alter column project_boq_lines_type
      set not null;
  end if;
end
$$;

comment on type public.project_boq_lines_type is
  'planned = contract baseline BOQ row; other values = supplementary line for that domain.';

comment on column public.project_boq_lines.project_boq_lines_type is
  'planned: core planned BOQ. estimation / measurement / billing: supplementary line for that domain only.';
