## Frontend API: Items

Two layers: **Views** for flat data with PostgREST filtering/sorting/pagination, **RPCs** for tree operations and complex search.

```
Views → supabase.from('view_name').select().eq().order().range()
RPCs  → supabase.rpc('function_name', { params })
```

---

### Views

#### v_schedule_sources

Browse all schedule sources with version count.

```sql
create or replace view public.v_schedule_sources as
select
  s.id,
  s.name,
  s.display_name,
  s.type,
  s.status,
  s.created_at,
  s.updated_at,
  count(v.id)::int as version_count
from public.schedule_sources s
left join public.schedule_source_versions v
  on v.schedule_source_id = s.id and v.status = 'active'
group by s.id;
```

Frontend usage:

```ts
supabase
  .from('v_schedule_sources')
  .select()
  .eq('status', 'active')
  .order('display_name');
```

---

#### v_schedule_versions

Browse versions for a source with item count.

```sql
create or replace view public.v_schedule_versions as
select
  v.id,
  v.schedule_source_id,
  v.name,
  v.display_name,
  v.year,
  v.region,
  v.metadata,
  v.status,
  v.created_at,
  v.updated_at,
  s.display_name as source_display_name,
  s.type as source_type,
  count(si.id)::int as item_count
from public.schedule_source_versions v
join public.schedule_sources s on s.id = v.schedule_source_id
left join public.schedule_items si
  on si.schedule_source_version_id = v.id
  and si.status = 'active'
  and si.node_type = 'item'
group by v.id, s.display_name, s.type;
```

Frontend usage:

```ts
supabase
  .from('v_schedule_versions')
  .select()
  .eq('schedule_source_id', sourceId)
  .eq('status', 'active')
  .order('year', { ascending: false });
```

---

#### v_schedule_items

Flat filterable/sortable view of items with unit symbol and parent code. Used for admin listing, export, and item browsing outside tree mode.

```sql
create or replace view public.v_schedule_items as
select
  si.id,
  si.schedule_source_version_id,
  si.parent_item_id,
  si.code,
  si.slug,
  si.description,
  si.node_type,
  si.rate,
  si.item_type,
  si.order_index,
  si.status,
  si.source_page_number,
  si.created_at,
  nlevel(si.path)::int as depth,
  coalesce(u.symbol, du.display_name) as unit_display,
  p.code as parent_code,
  p.description as parent_description
from public.schedule_items si
left join public.units u on u.id = si.unit_id
left join public.derived_units du on du.id = si.derived_unit_id
left join public.schedule_items p on p.id = si.parent_item_id;
```

Frontend usage:

```ts
supabase
  .from('v_schedule_items')
  .select()
  .eq('schedule_source_version_id', versionId)
  .eq('node_type', 'item')
  .eq('status', 'active')
  .ilike('description', '%cement%')
  .order('code')
  .range(0, 49);
```

---

#### View RLS

Views inherit RLS from the underlying tables. No additional policies needed.

---

### RPC Functions

All RPCs are `security definer` with `search_path = ''`. Auth checks are embedded.

---

#### rpc_get_schedule_roots

Returns root-level sections for a version. Used on initial tree load.

```sql
create or replace function public.rpc_get_schedule_roots(
  p_version_id uuid
)
returns table (
  id uuid,
  code text,
  slug text,
  description text,
  node_type public.schedule_node_type,
  order_index int,
  has_children boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return;
  end if;

  return query
  select si.id, si.code, si.slug, si.description, si.node_type, si.order_index,
    exists(
      select 1 from public.schedule_items c
      where c.parent_item_id = si.id and c.status = 'active'
    ) as has_children
  from public.schedule_items si
  where si.schedule_source_version_id = p_version_id
    and si.parent_item_id is null
    and si.status = 'active'
  order by si.order_index;
end;
$$;
```

---

#### rpc_get_schedule_children

Returns direct children of a node. Used for lazy-loading on tree expand.

```sql
create or replace function public.rpc_get_schedule_children(
  p_parent_id uuid
)
returns table (
  id uuid,
  code text,
  slug text,
  description text,
  node_type public.schedule_node_type,
  rate numeric,
  unit_display text,
  order_index int,
  has_children boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return;
  end if;

  return query
  select
    si.id, si.code, si.slug, si.description, si.node_type,
    si.rate,
    coalesce(u.symbol, du.display_name) as unit_display,
    si.order_index,
    exists(
      select 1 from public.schedule_items c
      where c.parent_item_id = si.id and c.status = 'active'
    ) as has_children
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  left join public.derived_units du on du.id = si.derived_unit_id
  where si.parent_item_id = p_parent_id
    and si.status = 'active'
  order by si.order_index;
end;
$$;
```

---

#### rpc_get_schedule_ancestors

Returns ancestor chain for a node. Used for breadcrumbs and path expansion.

```sql
create or replace function public.rpc_get_schedule_ancestors(
  p_item_id uuid
)
returns table (
  id uuid,
  code text,
  slug text,
  description text,
  node_type public.schedule_node_type,
  depth int
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  item_path ltree;
  item_version_id uuid;
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return;
  end if;

  select si.path, si.schedule_source_version_id
  into item_path, item_version_id
  from public.schedule_items si
  where si.id = p_item_id;

  if item_path is null then
    return;
  end if;

  return query
  select si.id, si.code, si.slug, si.description, si.node_type,
    nlevel(si.path)::int as depth
  from public.schedule_items si
  where si.path @> item_path
    and si.schedule_source_version_id = item_version_id
    and si.status = 'active'
  order by nlevel(si.path);
end;
$$;
```

---

#### rpc_get_schedule_item_detail

Returns full item detail with rates and annotations as JSON. Used when clicking an item.

```sql
create or replace function public.rpc_get_schedule_item_detail(
  p_item_id uuid
)
returns json
language plpgsql stable security definer
set search_path = ''
as $$
declare
  result json;
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return null;
  end if;

  select json_build_object(
    'id', si.id,
    'code', si.code,
    'slug', si.slug,
    'description', si.description,
    'node_type', si.node_type,
    'rate', si.rate,
    'item_type', si.item_type,
    'order_index', si.order_index,
    'source_page_number', si.source_page_number,
    'depth', nlevel(si.path)::int,
    'unit', case
      when u.id is not null then json_build_object(
        'name', u.name, 'display_name', u.display_name, 'symbol', u.symbol
      )
      when du.id is not null then json_build_object(
        'name', du.name, 'display_name', du.display_name
      )
      else null
    end,
    'rates', coalesce((
      select json_agg(json_build_object(
        'id', r.id, 'context', r.context, 'rate', r.rate
      ))
      from public.schedule_item_rates r
      where r.schedule_item_id = si.id
    ), '[]'::json),
    'annotations', coalesce((
      select json_agg(json_build_object(
        'id', a.id, 'type', a.type, 'raw_text', a.raw_text
      ) order by a.order_index)
      from public.schedule_item_annotations a
      where a.schedule_item_id = si.id
    ), '[]'::json)
  ) into result
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  left join public.derived_units du on du.id = si.derived_unit_id
  where si.id = p_item_id
    and si.status = 'active';

  return result;
end;
$$;
```

---

#### rpc_search_schedule_items

Combined ranked search with matches + ancestor paths + aggregations. Powers the tree search UX.

```sql
create or replace function public.rpc_search_schedule_items(
  p_version_id uuid,
  p_query text,
  p_limit int default 50
)
returns json
language plpgsql stable security definer
set search_path = ''
as $$
declare
  result json;
  tsq tsquery;
  sanitized text;
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return json_build_object('matches', '[]'::json, 'aggregations', '[]'::json, 'total', 0);
  end if;

  sanitized := trim(p_query);
  if sanitized = '' then
    return json_build_object('matches', '[]'::json, 'aggregations', '[]'::json, 'total', 0);
  end if;

  tsq := to_tsquery('simple', array_to_string(
    array(select unnest(string_to_array(sanitized, ' ')) || ':*'),
    ' & '
  ));

  with matches as (
    select si.id, si.code, si.slug, si.description, si.node_type, si.path,
      si.rate,
      case
        when si.code = sanitized then 3
        when si.code like sanitized || '%' then 2
        else 1
      end as match_score,
      ts_rank(si.search_vector, tsq) as text_rank
    from public.schedule_items si
    where si.schedule_source_version_id = p_version_id
      and si.status = 'active'
      and (
        si.code like sanitized || '%'
        or si.search_vector @@ tsq
      )
    order by match_score desc, text_rank desc
    limit p_limit
  ),
  matches_with_ancestors as (
    select
      m.id, m.code, m.slug, m.description, m.node_type,
      m.rate, m.match_score, m.text_rank,
      coalesce(
        array_agg(a.code order by nlevel(a.path))
          filter (where a.id is not null and a.id != m.id),
        '{}'
      ) as ancestor_codes,
      coalesce(
        array_agg(a.id order by nlevel(a.path))
          filter (where a.id is not null and a.id != m.id),
        '{}'
      ) as ancestor_ids
    from matches m
    left join public.schedule_items a
      on a.path @> m.path
      and a.schedule_source_version_id = p_version_id
      and a.status = 'active'
    group by m.id, m.code, m.slug, m.description, m.node_type,
      m.rate, m.match_score, m.text_rank, m.path
  ),
  aggregations as (
    select
      a.id, a.code, a.slug, a.node_type,
      count(*)::int as match_count
    from public.schedule_items a
    join matches m on m.path <@ a.path
    where a.schedule_source_version_id = p_version_id
      and a.node_type in ('section', 'group')
      and a.status = 'active'
    group by a.id, a.code, a.slug, a.node_type
  )
  select json_build_object(
    'matches', coalesce((
      select json_agg(json_build_object(
        'id', ma.id,
        'code', ma.code,
        'slug', ma.slug,
        'description', ma.description,
        'node_type', ma.node_type,
        'rate', ma.rate,
        'match_score', ma.match_score,
        'ancestor_codes', ma.ancestor_codes,
        'ancestor_ids', ma.ancestor_ids
      ) order by ma.match_score desc, ma.text_rank desc)
      from matches_with_ancestors ma
    ), '[]'::json),
    'aggregations', coalesce((
      select json_agg(json_build_object(
        'id', ag.id,
        'code', ag.code,
        'slug', ag.slug,
        'node_type', ag.node_type,
        'match_count', ag.match_count
      ) order by ag.code)
      from aggregations ag
    ), '[]'::json),
    'total', (select count(*)::int from matches)
  ) into result;

  return result;
end;
$$;
```

---

#### rpc_get_schedule_subtree

Returns a subtree under a node with depth limit. Used for deep expansion.

```sql
create or replace function public.rpc_get_schedule_subtree(
  p_node_id uuid,
  p_max_depth int default 10
)
returns table (
  id uuid,
  parent_item_id uuid,
  code text,
  slug text,
  description text,
  node_type public.schedule_node_type,
  rate numeric,
  unit_display text,
  order_index int,
  depth int
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  node_path ltree;
  node_version_id uuid;
  node_depth int;
begin
  if not authz.is_session_valid() or authz.is_account_locked() then
    return;
  end if;

  select si.path, si.schedule_source_version_id, nlevel(si.path)
  into node_path, node_version_id, node_depth
  from public.schedule_items si
  where si.id = p_node_id;

  if node_path is null then
    return;
  end if;

  return query
  select si.id, si.parent_item_id, si.code, si.slug, si.description,
    si.node_type, si.rate,
    coalesce(u.symbol, du.display_name) as unit_display,
    si.order_index,
    (nlevel(si.path) - node_depth)::int as depth
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  left join public.derived_units du on du.id = si.derived_unit_id
  where si.path <@ node_path
    and si.schedule_source_version_id = node_version_id
    and si.status = 'active'
    and nlevel(si.path) - node_depth <= p_max_depth
  order by si.path;
end;
$$;
```

---

#### Grant RPC access

```sql
grant execute on function public.rpc_get_schedule_roots to authenticated;
grant execute on function public.rpc_get_schedule_children to authenticated;
grant execute on function public.rpc_get_schedule_ancestors to authenticated;
grant execute on function public.rpc_get_schedule_item_detail to authenticated;
grant execute on function public.rpc_search_schedule_items to authenticated;
grant execute on function public.rpc_get_schedule_subtree to authenticated;

revoke execute on function public.rpc_get_schedule_roots from anon, public;
revoke execute on function public.rpc_get_schedule_children from anon, public;
revoke execute on function public.rpc_get_schedule_ancestors from anon, public;
revoke execute on function public.rpc_get_schedule_item_detail from anon, public;
revoke execute on function public.rpc_search_schedule_items from anon, public;
revoke execute on function public.rpc_get_schedule_subtree from anon, public;
```

---

## Frontend API Summary

| Operation                     | Layer | Function / View                                       |
| ----------------------------- | ----- | ----------------------------------------------------- |
| Browse sources                | View  | `v_schedule_sources`                                  |
| Browse versions               | View  | `v_schedule_versions`                                 |
| List/filter/sort items (flat) | View  | `v_schedule_items`                                    |
| Tree: load roots              | RPC   | `rpc_get_schedule_roots(version_id)`                  |
| Tree: expand node             | RPC   | `rpc_get_schedule_children(parent_id)`                |
| Tree: breadcrumbs             | RPC   | `rpc_get_schedule_ancestors(item_id)`                 |
| Tree: deep expand             | RPC   | `rpc_get_schedule_subtree(node_id, max_depth)`        |
| Item detail (click)           | RPC   | `rpc_get_schedule_item_detail(item_id)`               |
| Search (tree + flat)          | RPC   | `rpc_search_schedule_items(version_id, query, limit)` |
