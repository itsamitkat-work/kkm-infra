-- System admins bypass the JWT vs DB permission_version check.
--
-- Without this, assigning or changing tenant membership bumps
-- tenant_members.permission_version while the session JWT still carries an
-- older `pv` claim. Then authz.check_permission_version() returns false for
-- every RLS policy that requires it, including inserts that already allow
-- authz.is_system_admin() — so admins appear "fully privileged" in the UI
-- but get 42501 on clients/projects/etc. until they sign out and back in.

create or replace function authz.check_permission_version()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tid uuid := (select authz.current_tenant_id());
  jwt_pv integer;
  db_pv integer;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  jwt_pv := coalesce(((select auth.jwt()) ->> 'pv')::integer, 0);

  select tm.permission_version
  into db_pv
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = v_tid
    and tm.status = 'active'
  limit 1;

  return jwt_pv >= coalesce(db_pv, 0);
end;
$$;
