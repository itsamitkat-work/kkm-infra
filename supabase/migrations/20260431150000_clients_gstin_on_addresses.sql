-- GSTIN moves to clients.addresses[] JSON (per address). Drop table-level gstin.

drop function if exists public.list_clients(
  text,
  text[],
  text,
  text,
  integer,
  integer
);

create or replace function public.list_clients(
  p_search text default null,
  p_status text[] default null,
  p_sort_by text default 'created_at',
  p_sort_dir text default 'desc',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  tenant_id uuid,
  display_name text,
  full_name text,
  addresses jsonb,
  contacts jsonb,
  status text,
  meta jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint,
  default_schedule_source_id uuid,
  default_schedule_display_name text
)
language plpgsql
stable
set search_path to public, authz
as $_$
declare
  v_status text[];
  v_sort_by text;
  v_sort_dir text;
  v_order_clause text;
begin
  v_status := case
    when p_status is null or coalesce(cardinality(p_status), 0) = 0 then array['active']::text[]
    else p_status
  end;

  v_sort_by := lower(coalesce(p_sort_by, 'created_at'));
  if v_sort_by not in ('created_at', 'updated_at', 'display_name', 'status') then
    v_sort_by := 'created_at';
  end if;

  v_sort_dir := lower(coalesce(p_sort_dir, 'desc'));
  if v_sort_dir not in ('asc', 'desc') then
    v_sort_dir := 'desc';
  end if;

  v_order_clause := case v_sort_by
    when 'display_name' then format('b.display_name %s', v_sort_dir)
    when 'status' then format('b.status %s', v_sort_dir)
    when 'updated_at' then format('b.updated_at %s', v_sort_dir)
    else format('b.created_at %s', v_sort_dir)
  end;

  return query execute format($sql$
    with base as (
      select c.*
      from public.clients c
      where
        (
          $1::text is null
          or length(trim($1::text)) = 0
          or c.display_name ilike '%%' || trim($1::text) || '%%'
          or (c.full_name is not null and c.full_name ilike '%%' || trim($1::text) || '%%')
          or exists (
            select 1
            from jsonb_array_elements(coalesce(c.addresses, '[]'::jsonb)) as addr
            where addr->>'gstin' is not null
              and (addr->>'gstin') ilike '%%' || trim($1::text) || '%%'
          )
        )
        and c.status = any ($2::text[])
    ),
    sliced as (
      select
        b.*,
        (select count(*)::bigint from base) as total_count
      from base b
      order by %s
      limit $3::int offset $4::int
    )
    select
      s.id,
      s.tenant_id,
      s.display_name,
      s.full_name,
      s.addresses,
      s.contacts,
      s.status,
      s.meta,
      s.created_at,
      s.updated_at,
      s.total_count,
      cs.schedule_source_id as default_schedule_source_id,
      ss.display_name as default_schedule_display_name
    from sliced s
    left join lateral (
      select cs0.schedule_source_id
      from public.client_schedules cs0
      where cs0.client_id = s.id
        and cs0.is_default
        and cs0.is_active
      limit 1
    ) cs on true
    left join public.schedule_sources ss on ss.id = cs.schedule_source_id
  $sql$, v_order_clause)
  using
    p_search,
    v_status,
    p_limit,
    p_offset;
end;
$_$;

alter function public.list_clients(
  text,
  text[],
  text,
  text,
  integer,
  integer
) owner to postgres;

revoke all on function public.list_clients(
  text,
  text[],
  text,
  text,
  integer,
  integer
) from public;

grant all on function public.list_clients(
  text,
  text[],
  text,
  text,
  integer,
  integer
) to anon, authenticated, service_role;

drop index if exists public.clients_tenant_gstin_idx;

alter table public.clients
  drop constraint if exists clients_gstin_format_check;

alter table public.clients
  drop column if exists gstin;
