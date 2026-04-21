-- ==========================================================================
-- Projects INSERT RLS: evaluate manage + permission_version against the
-- inserted row's tenant_id (after BEFORE trigger), not only JWT tid.
--
-- authz.has_permission(p) and authz.check_permission_version() both resolve
-- tenant_members via authz.current_tenant_id() (JWT tid). If the session
-- claim is missing or out of sync with the row being inserted, INSERT can
-- fail WITH CHECK even though projects_set_tenant_before_insert already set
-- NEW.tenant_id correctly.
-- ==========================================================================

begin;

create or replace function authz.has_permission_for_tenant(
  p_tenant_id uuid,
  p_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, authz
as $$
declare
  v_uid uuid := (select auth.uid());
  v_active_role_id uuid;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  if p_tenant_id is null or p_permission is null or length(trim(p_permission)) = 0 then
    return false;
  end if;

  select tm.active_role_id
  into v_active_role_id
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  if v_active_role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from authz.tenant_role_permissions trp
    join authz.permissions perm on perm.id = trp.permission_id
    where trp.tenant_role_id = v_active_role_id
      and perm.key = p_permission
  );
end;
$$;

create or replace function authz.check_permission_version_for_tenant(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, authz
as $$
declare
  v_uid uuid := (select auth.uid());
  jwt_pv integer;
  db_pv integer;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  if p_tenant_id is null then
    return false;
  end if;

  jwt_pv := coalesce(((select auth.jwt()) ->> 'pv')::integer, 0);

  select tm.permission_version
  into db_pv
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  return jwt_pv >= coalesce(db_pv, 0);
end;
$$;

grant execute on function authz.has_permission_for_tenant(uuid, text) to authenticated;
grant execute on function authz.check_permission_version_for_tenant(uuid) to authenticated;

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (
      (select authz.is_system_admin())
      or (
        (select authz.check_permission_version_for_tenant(projects.tenant_id))
        and (select authz.has_permission_for_tenant(projects.tenant_id, 'projects.manage'))
      )
    )
  );

commit;
