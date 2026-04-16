-- ==========================================================================
-- Migration: Projects — RLS, policy helper, RPCs
-- ==========================================================================

create or replace function public.project_policy_ok(p_project_id uuid, p_action text)
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
    and p_project_id is not null
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and (
          (select authz.is_system_admin())
          or (
            p.tenant_id = (select authz.current_tenant_id())
            and (
              (p_action = 'read' and (select authz.has_permission('projects.read')))
              or (p_action = 'create' and (select authz.has_permission('projects.create')))
              or (p_action = 'update' and (select authz.has_permission('projects.update')))
              or (p_action = 'delete' and (select authz.has_permission('projects.delete')))
            )
          )
        )
    );
$$;

grant execute on function public.project_policy_ok(uuid, text) to authenticated;

alter table public.projects enable row level security;

create policy projects_select on public.projects
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(projects.id, 'read'))
  );

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('projects.create'))
      )
    )
  );

create policy projects_update on public.projects
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(projects.id, 'update'))
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

create policy projects_delete on public.projects
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(projects.id, 'delete'))
  );

alter table public.project_schedules enable row level security;

create policy project_schedules_select on public.project_schedules
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_schedules.project_id, 'read'))
  );

create policy project_schedules_insert on public.project_schedules
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_schedules.project_id, 'update'))
  );

create policy project_schedules_update on public.project_schedules
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_schedules.project_id, 'update'))
  )
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_schedules.project_id, 'update'))
  );

create policy project_schedules_delete on public.project_schedules
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_schedules.project_id, 'update'))
  );

alter table public.project_members enable row level security;

create policy project_members_select on public.project_members
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_members.project_id, 'read'))
  );

create policy project_members_insert on public.project_members
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_members.project_id, 'update'))
  );

create policy project_members_update on public.project_members
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_members.project_id, 'update'))
  )
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_members.project_id, 'update'))
  );

create policy project_members_delete on public.project_members
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select public.project_policy_ok(project_members.project_id, 'update'))
  );

create or replace function public.set_default_project_schedule(
  p_project_id uuid,
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
  if not (select public.project_policy_ok(p_project_id, 'update')) then
    raise exception 'not allowed';
  end if;

  update public.project_schedules
  set is_default = false
  where project_id = p_project_id;

  update public.project_schedules
  set is_default = true
  where project_id = p_project_id
    and schedule_source_id = p_schedule_source_id;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise exception 'schedule link not found for project';
  end if;
end;
$$;

grant execute on function public.set_default_project_schedule(uuid, uuid) to authenticated;

create or replace function public.list_projects(
  p_search text default null,
  p_status text[] default null,
  p_dos_from date default null,
  p_dos_to date default null,
  p_doc_from date default null,
  p_doc_to date default null,
  p_amount_min numeric default null,
  p_amount_max numeric default null,
  p_sort_by text default 'created_at',
  p_sort_dir text default 'desc',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  tenant_id uuid,
  name text,
  code text,
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
  if v_sort_by not in (
    'created_at', 'updated_at', 'name', 'code', 'status',
    'sanctionamount', 'sanctiondos', 'sanctiondoc', 'projectlocation'
  ) then
    v_sort_by := 'created_at';
  end if;

  v_sort_dir := lower(coalesce(p_sort_dir, 'desc'));
  if v_sort_dir not in ('asc', 'desc') then
    v_sort_dir := 'desc';
  end if;

  v_order_clause := case v_sort_by
    when 'name' then format('b.name %s', v_sort_dir)
    when 'code' then format('b.code %s nulls last', v_sort_dir)
    when 'status' then format('b.status %s', v_sort_dir)
    when 'updated_at' then format('b.updated_at %s', v_sort_dir)
    when 'sanctionamount' then format(
      '(nullif(b.meta->>''sanction_amount'',''''))::numeric %s nulls last',
      v_sort_dir
    )
    when 'sanctiondos' then format(
      '(nullif(b.meta->>''sanction_dos'',''''))::date %s nulls last',
      v_sort_dir
    )
    when 'sanctiondoc' then format(
      '(nullif(b.meta->>''sanction_doc'',''''))::date %s nulls last',
      v_sort_dir
    )
    when 'projectlocation' then format(
      'lower(coalesce(b.meta->>''location'','''')) %s nulls last',
      v_sort_dir
    )
    else format('b.created_at %s', v_sort_dir)
  end;

  return query execute format($sql$
    with base as (
      select p.*
      from public.projects p
      where
        (
          $1::text is null
          or length(trim($1::text)) = 0
          or p.name ilike '%%' || trim($1::text) || '%%'
          or (p.code is not null and p.code ilike '%%' || trim($1::text) || '%%')
        )
        and p.status = any ($2::text[])
        and (
          $3::date is null
          or (
            nullif(p.meta->>'sanction_dos', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_dos', ''))::date >= $3::date
          )
        )
        and (
          $4::date is null
          or (
            nullif(p.meta->>'sanction_dos', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_dos', ''))::date <= $4::date
          )
        )
        and (
          $5::date is null
          or (
            nullif(p.meta->>'sanction_doc', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_doc', ''))::date >= $5::date
          )
        )
        and (
          $6::date is null
          or (
            nullif(p.meta->>'sanction_doc', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_doc', ''))::date <= $6::date
          )
        )
        and (
          $7::numeric is null
          or coalesce((nullif(p.meta->>'sanction_amount', ''))::numeric, 0) >= $7::numeric
        )
        and (
          $8::numeric is null
          or coalesce((nullif(p.meta->>'sanction_amount', ''))::numeric, 0) <= $8::numeric
        )
    ),
    sliced as (
      select
        b.*,
        (select count(*)::bigint from base) as total_count
      from base b
      order by %s
      limit $9::int offset $10::int
    )
    select
      s.id,
      s.tenant_id,
      s.name,
      s.code,
      s.status,
      s.meta,
      s.created_at,
      s.updated_at,
      s.total_count,
      ps.schedule_source_id as default_schedule_source_id,
      ss.display_name as default_schedule_display_name
    from sliced s
    left join lateral (
      select ps0.schedule_source_id
      from public.project_schedules ps0
      where ps0.project_id = s.id
        and ps0.is_default
        and ps0.is_active
      limit 1
    ) ps on true
    left join public.schedule_sources ss on ss.id = ps.schedule_source_id
  $sql$, v_order_clause)
  using
    p_search,
    v_status,
    p_dos_from,
    p_dos_to,
    p_doc_from,
    p_doc_to,
    p_amount_min,
    p_amount_max,
    p_limit,
    p_offset;
end;
$$;

grant execute on function public.list_projects(
  text, text[], date, date, date, date, numeric, numeric, text, text, int, int
) to authenticated;
