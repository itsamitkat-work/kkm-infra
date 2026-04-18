-- ==========================================================================
-- Migration: Clients — RLS, policy helper, RPCs
-- ==========================================================================
-- Mirrors the projects RLS/RPC pattern in 20260418100100. Adds:
--   * public.client_policy_ok(uuid, text) helper
--   * RLS policies on public.clients and public.client_schedules
--   * public.set_default_client_schedule(uuid, uuid) RPC
--   * public.list_clients(...) paginated RPC with default schedule join
-- ==========================================================================

create or replace function public.client_policy_ok(p_client_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public, authz
as $$
  select
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and p_client_id is not null
    and exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and (
          (select authz.is_system_admin())
          or (
            c.tenant_id = (select authz.current_tenant_id())
            and (
              (p_action = 'read' and (select authz.has_permission('clients.read')))
              or (p_action = 'create' and (select authz.has_permission('clients.create')))
              or (p_action = 'update' and (select authz.has_permission('clients.update')))
              or (p_action = 'delete' and (select authz.has_permission('clients.delete')))
            )
          )
        )
    );
$$;

grant execute on function public.client_policy_ok(uuid, text) to authenticated;

alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(clients.id, 'read'))
  );

create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('clients.create'))
      )
    )
  );

create policy clients_update on public.clients
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(clients.id, 'update'))
  )
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (
      (select authz.is_system_admin())
      or tenant_id = (select authz.current_tenant_id())
    )
  );

create policy clients_delete on public.clients
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(clients.id, 'delete'))
  );

alter table public.client_schedules enable row level security;

create policy client_schedules_select on public.client_schedules
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(client_schedules.client_id, 'read'))
  );

create policy client_schedules_insert on public.client_schedules
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.client_policy_ok(client_schedules.client_id, 'update'))
  );

create policy client_schedules_update on public.client_schedules
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(client_schedules.client_id, 'update'))
  )
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.client_policy_ok(client_schedules.client_id, 'update'))
  );

create policy client_schedules_delete on public.client_schedules
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.client_policy_ok(client_schedules.client_id, 'update'))
  );

create or replace function public.set_default_client_schedule(
  p_client_id uuid,
  p_schedule_source_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_row_count int;
begin
  if not (select public.client_policy_ok(p_client_id, 'update')) then
    raise exception 'not allowed';
  end if;

  update public.client_schedules
  set is_default = false
  where client_id = p_client_id;

  update public.client_schedules
  set is_default = true
  where client_id = p_client_id
    and schedule_source_id = p_schedule_source_id;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise exception 'schedule link not found for client';
  end if;
end;
$$;

grant execute on function public.set_default_client_schedule(uuid, uuid) to authenticated;

create or replace function public.list_clients(
  p_search text default null,
  p_status text[] default null,
  p_sort_by text default 'created_at',
  p_sort_dir text default 'desc',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  tenant_id uuid,
  display_name text,
  full_name text,
  gstin text,
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
security invoker
set search_path = public, authz
as $$
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
          or (c.gstin is not null and c.gstin ilike '%%' || trim($1::text) || '%%')
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
      s.gstin,
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
$$;

grant execute on function public.list_clients(
  text, text[], text, text, int, int
) to authenticated;
