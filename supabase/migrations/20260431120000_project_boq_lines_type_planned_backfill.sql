-- Add enum label `planned` alone so it commits before any UPDATE casts to it
-- (PostgreSQL 55P04: unsafe use of new value in same transaction).

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_boq_lines_type'
  )
  and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_boq_lines_type'
      and e.enumlabel = 'planned'
  ) then
    alter type public.project_boq_lines_type add value 'planned';
  end if;
end
$$;
