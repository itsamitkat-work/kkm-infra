-- Allow schedule_items with parent_item_id null for any node_type (e.g. root-level items).

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'schedule_items'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%parent_item_id%'
    and pg_get_constraintdef(c.oid) ilike '%node_type%'
    and pg_get_constraintdef(c.oid) ilike '%section%';

  if constraint_name is not null then
    execute format('alter table public.schedule_items drop constraint %I', constraint_name);
  end if;
end $$;
