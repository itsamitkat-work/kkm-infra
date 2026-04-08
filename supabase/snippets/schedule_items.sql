select
  code,
  depth,
  path_text,
  parent_code,
  source_version_display_name,
  description
from public.schedule_items_tree
where schedule_source_version_id = 'a2222222-2222-4222-8222-222222222201'
order by path;