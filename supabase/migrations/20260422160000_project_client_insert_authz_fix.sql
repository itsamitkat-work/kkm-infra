-- ==========================================================================
-- Fix INSERT RLS for projects (and clients) when:
--  1) JWT `pv` is behind DB permission_version (common after seed / role edits).
--     INSERT no longer requires check_permission_version — manage + session
--     are enough; updates/selects still enforce pv via existing helpers.
--  2) has_permission_for_tenant only looked at tenant_members.active_role_id.
--     Permission may exist on another assigned tenant_role; use junction.
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
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  if p_tenant_id is null or p_permission is null or length(trim(p_permission)) = 0 then
    return false;
  end if;

  if v_uid is null then
    return false;
  end if;

  return exists (
    select 1
    from public.tenant_members tm
    join authz.tenant_member_roles tmr on tmr.tenant_member_id = tm.id
    join authz.tenant_role_permissions trp on trp.tenant_role_id = tmr.tenant_role_id
    join authz.permissions perm on perm.id = trp.permission_id
    where tm.user_id = v_uid
      and tm.tenant_id = p_tenant_id
      and tm.status = 'active'
      and perm.key = p_permission
  );
end;
$$;

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (
      (select authz.is_system_admin())
      or (
        (select authz.has_permission_for_tenant(projects.tenant_id, 'projects.manage'))
      )
    )
  );

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (
      (select authz.is_system_admin())
      or (
        (select authz.has_permission_for_tenant(clients.tenant_id, 'clients.manage'))
      )
    )
  );

commit;
