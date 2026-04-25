-- Atomic permission replacement for tenant roles.
-- Prevents partial delete/insert writes and blocks self-role edits for
-- non-system admins.

create or replace function public.replace_tenant_role_permissions(
  p_tenant_role_id uuid,
  p_permission_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_current_tenant_id uuid := (select authz.current_tenant_id());
  v_is_system_admin boolean := (select authz.is_system_admin());
begin
  if p_tenant_role_id is null then
    raise exception 'Role id is required';
  end if;

  if not (select authz.is_session_valid()) or (select authz.is_account_locked()) then
    raise exception using errcode = '42501', message = 'Session is not valid for this operation';
  end if;

  if not v_is_system_admin then
    if not (select authz.check_permission_version()) then
      raise exception using errcode = '42501', message = 'Permission version is stale';
    end if;
    if not (select authz.has_permission('tenant_roles.manage'::text)) then
      raise exception using errcode = '42501', message = 'Insufficient permission to manage roles';
    end if;
    if exists (
      select 1
      from public.tenant_members tm
      join authz.tenant_member_roles tmr on tmr.tenant_member_id = tm.id
      where tm.user_id = v_uid
        and tm.tenant_id = v_current_tenant_id
        and tm.status = 'active'
        and tmr.tenant_role_id = p_tenant_role_id
    ) then
      raise exception using errcode = '42501', message = 'You cannot modify permissions for your own assigned role';
    end if;
  end if;

  if not exists (
    select 1
    from authz.tenant_roles tr
    where tr.id = p_tenant_role_id
      and (v_is_system_admin or tr.tenant_id = v_current_tenant_id)
  ) then
    raise exception using errcode = '42501', message = 'Role is not accessible in the active tenant';
  end if;

  if not v_is_system_admin then
    if exists (
      select 1
      from authz.tenant_roles tr
      where tr.id = p_tenant_role_id
        and tr.template_key is not null
        and authz.role_template_scope(tr.template_key) = 'platform'::authz.permission_scope
    ) then
      raise exception using errcode = '42501', message = 'Platform-scoped roles can only be managed by system administrators';
    end if;

    if exists (
      select 1
      from authz.permissions p
      where p.id = any(coalesce(p_permission_ids, '{}'::uuid[]))
        and p.scope = 'platform'::authz.permission_scope
    ) then
      raise exception using errcode = '42501', message = 'Platform-scoped permissions can only be managed by system administrators';
    end if;
  end if;

  delete from authz.tenant_role_permissions trp
  where trp.tenant_role_id = p_tenant_role_id;

  if coalesce(array_length(p_permission_ids, 1), 0) = 0 then
    return;
  end if;

  insert into authz.tenant_role_permissions (tenant_role_id, permission_id)
  select p_tenant_role_id, permission_id
  from (
    select distinct unnest(p_permission_ids) as permission_id
  ) deduped;
end;
$$;

revoke all on function public.replace_tenant_role_permissions(uuid, uuid[]) from public;
grant execute on function public.replace_tenant_role_permissions(uuid, uuid[]) to authenticated;
grant execute on function public.replace_tenant_role_permissions(uuid, uuid[]) to service_role;
