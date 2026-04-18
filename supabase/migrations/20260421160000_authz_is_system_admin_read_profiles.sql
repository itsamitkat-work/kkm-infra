-- Treat profiles.is_system_admin as authoritative when the JWT is stale (e.g. right
-- after seed or promoting a user). RLS policies use authz.is_system_admin() first.

begin;

create or replace function authz.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'is_system_admin')::boolean, false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_system_admin
    );
$$;

create or replace function authz.has_permission(p text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tid uuid := (select authz.current_tenant_id());
  v_active_role_id uuid;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  select tm.active_role_id
  into v_active_role_id
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = v_tid
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
      and perm.key = p
  );
end;
$$;

commit;
