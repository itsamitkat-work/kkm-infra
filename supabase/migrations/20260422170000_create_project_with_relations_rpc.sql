-- ==========================================================================
-- Atomic project create (project + default schedule + members) via
-- SECURITY DEFINER RPC so inserts are not blocked by RLS edge cases while
-- still enforcing the same session + tenant + projects.manage rules.
-- ==========================================================================

begin;

create or replace function public.create_project_with_relations(
  p_name text,
  p_code text,
  p_status text,
  p_meta jsonb,
  p_schedule_source_id uuid default null,
  p_members_by_slug jsonb default '{}'::jsonb
)
returns public.projects
language plpgsql
volatile
security definer
set search_path = public, authz
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

  insert into public.projects (name, code, status, meta, tenant_id)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_code, '')), ''),
    p_status,
    coalesce(p_meta, '{}'::jsonb),
    v_tid
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

grant execute on function public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb
) to authenticated;

revoke all on function public.create_project_with_relations(
  text,
  text,
  text,
  jsonb,
  uuid,
  jsonb
) from public;

commit;
