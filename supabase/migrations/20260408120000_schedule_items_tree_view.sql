-- Tree-oriented view over schedule_items: depth, root, parent labels, source context.
-- Uses security_invoker so RLS on underlying tables applies to the caller.

create or replace view public.schedule_items_tree
with (security_invoker = true)
as
select
  si.code,
  si.id,
  si.schedule_source_version_id,
  si.parent_item_id,
  si.path,
  si.path::text as path_text,
  nlevel(si.path) as depth,
  (
    select si_root.id
    from public.schedule_items si_root
    where si_root.schedule_source_version_id = si.schedule_source_version_id
      and si_root.path = subpath(si.path, 0, 1)
  ) as root_item_id,
  si.slug,
  si.description,
  si.node_type,
  si.unit_id,
  si.derived_unit_id,
  u.symbol as unit_symbol,
  u.display_name as unit_display_name,
  du.name as derived_unit_name,
  du.display_name as derived_unit_display_name,
  si.rate,
  si.item_type,
  si.order_index,
  si.ingestion_batch_id,
  si.source_page_number,
  si.status,
  si.created_at,
  si.updated_at,
  p.code as parent_code,
  p.description as parent_description,
  ssv.name as source_version_name,
  ssv.display_name as source_version_display_name,
  ssv.year as source_version_year,
  ss.id as schedule_source_id,
  ss.name as schedule_source_name,
  ss.display_name as schedule_source_display_name
from public.schedule_items si
left join public.schedule_items p on p.id = si.parent_item_id
join public.schedule_source_versions ssv on ssv.id = si.schedule_source_version_id
join public.schedule_sources ss on ss.id = ssv.schedule_source_id
left join public.units u on u.id = si.unit_id
left join public.derived_units du on du.id = si.derived_unit_id;

comment on view public.schedule_items_tree is
  'Schedule items with tree metadata (depth, root, path_text), parent codes, and source/version + unit context.';

grant select on public.schedule_items_tree to authenticated;
grant select on public.schedule_items_tree to service_role;
