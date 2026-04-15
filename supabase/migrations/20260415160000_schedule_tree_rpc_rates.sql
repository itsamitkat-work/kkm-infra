-- ==========================================================================
-- Add aggregated contextual rates (jsonb) to schedule tree RPCs
-- ==========================================================================

drop function if exists public.get_schedule_tree_roots(uuid);
drop function if exists public.get_schedule_tree_children(uuid, uuid);
drop function if exists public.search_schedule_tree(uuid, text, integer, integer);

create or replace function public.get_schedule_tree_roots(
  p_schedule_source_version_id uuid
)
returns table (
  id uuid,
  parent_item_id uuid,
  code text,
  description text,
  node_type public.schedule_node_type,
  depth integer,
  order_index integer,
  path_slug text,
  rate numeric,
  unit_symbol text,
  has_children boolean,
  annotations jsonb,
  rates jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    si.id,
    si.parent_item_id,
    si.code,
    si.description,
    si.node_type,
    public.nlevel(si.path) as depth,
    si.order_index,
    public.schedule_item_path_slug(si.id) as path_slug,
    si.rate,
    u.symbol as unit_symbol,
    exists (
      select 1
      from public.schedule_items child
      where child.parent_item_id = si.id
        and child.schedule_source_version_id = si.schedule_source_version_id
    ) as has_children,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'type', a.type,
            'raw_text', a.raw_text,
            'order_index', a.order_index
          )
          order by a.order_index nulls last, a.created_at
        )
        from public.schedule_item_annotations a
        where a.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as annotations,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'context', r.context,
            'label', r.label,
            'rate', r.rate,
            'rate_display', r.rate_display,
            'order_index', r.order_index
          )
          order by r.order_index nulls last, r.context
        )
        from public.schedule_item_rates r
        where r.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as rates
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  where si.schedule_source_version_id = p_schedule_source_version_id
    and si.parent_item_id is null
  order by
    public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
    public.schedule_item_path_slug(si.id);
$$;

create or replace function public.get_schedule_tree_children(
  p_schedule_source_version_id uuid,
  p_parent_item_id uuid
)
returns table (
  id uuid,
  parent_item_id uuid,
  code text,
  description text,
  node_type public.schedule_node_type,
  depth integer,
  order_index integer,
  path_slug text,
  rate numeric,
  unit_symbol text,
  has_children boolean,
  annotations jsonb,
  rates jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    si.id,
    si.parent_item_id,
    si.code,
    si.description,
    si.node_type,
    public.nlevel(si.path) as depth,
    si.order_index,
    public.schedule_item_path_slug(si.id) as path_slug,
    si.rate,
    u.symbol as unit_symbol,
    exists (
      select 1
      from public.schedule_items child
      where child.parent_item_id = si.id
        and child.schedule_source_version_id = si.schedule_source_version_id
    ) as has_children,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'type', a.type,
            'raw_text', a.raw_text,
            'order_index', a.order_index
          )
          order by a.order_index nulls last, a.created_at
        )
        from public.schedule_item_annotations a
        where a.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as annotations,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'context', r.context,
            'label', r.label,
            'rate', r.rate,
            'rate_display', r.rate_display,
            'order_index', r.order_index
          )
          order by r.order_index nulls last, r.context
        )
        from public.schedule_item_rates r
        where r.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as rates
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  where si.schedule_source_version_id = p_schedule_source_version_id
    and si.parent_item_id = p_parent_item_id
  order by
    public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
    public.schedule_item_path_slug(si.id);
$$;

create or replace function public.search_schedule_tree(
  p_schedule_source_version_id uuid,
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  parent_item_id uuid,
  code text,
  description text,
  node_type public.schedule_node_type,
  depth integer,
  order_index integer,
  path_slug text,
  rate numeric,
  unit_symbol text,
  has_children boolean,
  ancestor_ids uuid[],
  annotations jsonb,
  rates jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive matched as (
    select
      si.id,
      si.parent_item_id,
      si.code,
      si.description,
      si.node_type,
      public.nlevel(si.path) as depth,
      si.order_index,
      public.schedule_item_path_slug(si.id) as path_slug,
      si.rate,
      u.symbol as unit_symbol,
      exists (
        select 1
        from public.schedule_items child
        where child.parent_item_id = si.id
          and child.schedule_source_version_id = si.schedule_source_version_id
      ) as has_children,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'type', a.type,
              'raw_text', a.raw_text,
              'order_index', a.order_index
            )
            order by a.order_index nulls last, a.created_at
          )
          from public.schedule_item_annotations a
          where a.schedule_item_id = si.id
        ),
        '[]'::jsonb
      ) as annotations,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'context', r.context,
              'label', r.label,
              'rate', r.rate,
              'rate_display', r.rate_display,
              'order_index', r.order_index
            )
            order by r.order_index nulls last, r.context
          )
          from public.schedule_item_rates r
          where r.schedule_item_id = si.id
        ),
        '[]'::jsonb
      ) as rates
    from public.schedule_items si
    left join public.units u on u.id = si.unit_id
    where si.schedule_source_version_id = p_schedule_source_version_id
      and length(trim(coalesce(p_query, ''))) >= 2
      and (
        si.code ilike '%' || trim(p_query) || '%'
        or si.description ilike '%' || trim(p_query) || '%'
      )
    order by
      case when si.code ilike trim(p_query) || '%' then 0 else 1 end,
      public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
      public.schedule_item_path_slug(si.id)
    limit greatest(coalesce(p_limit, 50), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  recursive_ancestors as (
    select
      m.id as item_id,
      parent.id as ancestor_id,
      parent.parent_item_id,
      1 as level_from_parent
    from matched m
    join public.schedule_items parent on parent.id = m.parent_item_id

    union all

    select
      ra.item_id,
      next_parent.id as ancestor_id,
      next_parent.parent_item_id,
      ra.level_from_parent + 1 as level_from_parent
    from recursive_ancestors ra
    join public.schedule_items next_parent on next_parent.id = ra.parent_item_id
  ),
  ancestor_path as (
    select
      item_id,
      coalesce(
        array_agg(ancestor_id order by level_from_parent desc),
        '{}'::uuid[]
      ) as ancestor_ids
    from recursive_ancestors
    group by item_id
  )
  select
    m.id,
    m.parent_item_id,
    m.code,
    m.description,
    m.node_type,
    m.depth,
    m.order_index,
    m.path_slug,
    m.rate,
    m.unit_symbol,
    m.has_children,
    coalesce(ap.ancestor_ids, '{}'::uuid[]) as ancestor_ids,
    m.annotations,
    m.rates
  from matched m
  left join ancestor_path ap on ap.item_id = m.id;
$$;

grant execute on function public.get_schedule_tree_roots(uuid) to authenticated;
grant execute on function public.get_schedule_tree_roots(uuid) to service_role;
grant execute on function public.get_schedule_tree_children(uuid, uuid) to authenticated;
grant execute on function public.get_schedule_tree_children(uuid, uuid) to service_role;
grant execute on function public.search_schedule_tree(uuid, text, integer, integer) to authenticated;
grant execute on function public.search_schedule_tree(uuid, text, integer, integer) to service_role;

revoke execute on function public.get_schedule_tree_roots(uuid) from public;
revoke execute on function public.get_schedule_tree_children(uuid, uuid) from public;
revoke execute on function public.search_schedule_tree(uuid, text, integer, integer) from public;
