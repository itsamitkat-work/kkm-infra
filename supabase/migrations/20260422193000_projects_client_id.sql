-- Normalized many-to-one: many projects can reference one client (projects.client_id → clients.id).
-- Variable fields (e.g. project-specific address/GST copy) stay in projects.meta (jsonb).
-- No data backfill — use a fresh db reset after this migration.

alter table public.projects
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists projects_client_id_idx
  on public.projects (client_id)
  where client_id is not null;

-- --------------------------------------------------------------------------
-- create_project_with_relations: optional p_client_id (same tenant as project)
-- --------------------------------------------------------------------------
drop function if exists public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb
);

create or replace function public.create_project_with_relations(
  p_name text,
  p_code text,
  p_status text,
  p_meta jsonb,
  p_schedule_source_id uuid default null,
  p_members_by_slug jsonb default '{}'::jsonb,
  p_client_id uuid default null
)
returns public.projects
language plpgsql
security definer
set search_path to public, authz
as $$
declare
  v_uid uuid := auth.uid();
  v_tid uuid;
  v_default uuid;
  new_project public.projects%rowtype;
  r_slug text;
  r_user_id text;
  v_role_id uuid;
  v_diag int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not (select authz.is_session_valid()) or (select authz.is_account_locked()) then
    raise exception 'session not allowed';
  end if;

  if (select authz.is_system_admin()) then
    v_default := (select authz.default_platform_tenant_id());
    if v_default is null then
      raise exception 'no tenants for default platform';
    end if;
    v_tid := v_default;
  else
    v_tid := (select authz.current_tenant_id());
    if v_tid is null then
      raise exception 'tenant context required';
    end if;
    if not (select authz.has_permission_for_tenant(v_tid, 'projects.manage')) then
      raise exception 'projects.manage required';
    end if;
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;

  if p_status is null or length(trim(p_status)) = 0 then
    raise exception 'status required';
  end if;

  if p_schedule_source_id is not null then
    if not exists (select 1 from public.schedule_sources ss where ss.id = p_schedule_source_id) then
      raise exception 'invalid schedule_source_id';
    end if;
  end if;

  if p_client_id is not null then
    if not exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and c.tenant_id = v_tid
    ) then
      raise exception 'invalid client_id or tenant mismatch';
    end if;
  end if;

  insert into public.projects (name, code, status, meta, tenant_id, client_id)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_code, '')), ''),
    p_status,
    coalesce(p_meta, '{}'::jsonb),
    v_tid,
    p_client_id
  )
  returning * into new_project;

  if p_schedule_source_id is not null then
    if not exists (
      select 1
      from public.project_schedules ps
      where ps.project_id = new_project.id
        and ps.schedule_source_id = p_schedule_source_id
    ) then
      insert into public.project_schedules (project_id, schedule_source_id, is_default, is_active)
      values (new_project.id, p_schedule_source_id, false, true);
    end if;

    update public.project_schedules
    set is_default = false
    where project_id = new_project.id;

    update public.project_schedules
    set is_default = true
    where project_id = new_project.id
      and schedule_source_id = p_schedule_source_id;

    get diagnostics v_diag = row_count;
    if v_diag = 0 then
      raise exception 'schedule link missing';
    end if;
  end if;

  for r_slug, r_user_id in
    select key, value
    from jsonb_each_text(coalesce(p_members_by_slug, '{}'::jsonb))
  loop
    if r_user_id is null or length(trim(r_user_id)) = 0 then
      continue;
    end if;

    select tr.id
    into v_role_id
    from authz.tenant_roles tr
    where tr.tenant_id = v_tid
      and tr.slug = r_slug
    limit 1;

    if v_role_id is null and r_slug in ('supervisor', 'superviser') then
      select tr.id
      into v_role_id
      from authz.tenant_roles tr
      where tr.tenant_id = v_tid
        and tr.slug in ('supervisor', 'superviser')
      order by case tr.slug when r_slug then 0 else 1 end, tr.slug
      limit 1;
    end if;

    if v_role_id is null then
      raise exception 'unknown role slug % for tenant', r_slug;
    end if;

    if not exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = v_tid
        and tm.user_id = r_user_id::uuid
        and tm.status = 'active'
    ) then
      raise exception 'user % is not an active tenant member', r_user_id;
    end if;

    insert into public.project_members (project_id, user_id, role_id)
    values (new_project.id, r_user_id::uuid, v_role_id)
    on conflict (project_id, user_id, role_id) do nothing;
  end loop;

  return new_project;
end;
$$;

alter function public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb,
  uuid
) owner to postgres;

revoke all on function public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb,
  uuid
) from public;

grant all on function public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb,
  uuid
) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- list_projects: expose client_id + denormalized display label from clients
-- --------------------------------------------------------------------------
drop function if exists public.list_projects(
  text,
  text[],
  date,
  date,
  date,
  date,
  numeric,
  numeric,
  text,
  text,
  integer,
  integer
);

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
  p_limit integer default 20,
  p_offset integer default 0
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
  default_schedule_display_name text,
  client_id uuid,
  client_display_name text
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
      ss.display_name as default_schedule_display_name,
      s.client_id,
      coalesce(cl.display_name, cl.full_name, ''::text) as client_display_name
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
    left join public.clients cl on cl.id = s.client_id
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
$_$;

alter function public.list_projects(
  text,
  text[],
  date,
  date,
  date,
  date,
  numeric,
  numeric,
  text,
  text,
  integer,
  integer
) owner to postgres;

revoke all on function public.list_projects(
  text,
  text[],
  date,
  date,
  date,
  date,
  numeric,
  numeric,
  text,
  text,
  integer,
  integer
) from public;

grant all on function public.list_projects(
  text,
  text[],
  date,
  date,
  date,
  date,
  numeric,
  numeric,
  text,
  text,
  integer,
  integer
) to anon, authenticated, service_role;
