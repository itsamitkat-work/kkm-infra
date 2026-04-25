-- Hide platform-scoped member assignments from tenant-scoped admins.
-- System administrators keep full visibility and write access.

create or replace function authz.tenant_member_has_platform_role(
  p_tenant_member_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from authz.tenant_member_roles tmr
    join authz.tenant_roles r on r.id = tmr.tenant_role_id
    where tmr.tenant_member_id = p_tenant_member_id
      and r.template_key is not null
      and authz.role_template_scope(r.template_key) = 'platform'::authz.permission_scope
  );
$$;

alter function authz.tenant_member_has_platform_role(uuid) owner to postgres;

revoke all on function authz.tenant_member_has_platform_role(uuid) from public;
grant execute on function authz.tenant_member_has_platform_role(uuid) to authenticated;

drop policy if exists "tenant_members_select" on public.tenant_members;
drop policy if exists "tenant_members_update" on public.tenant_members;
drop policy if exists "tenant_members_delete" on public.tenant_members;

create policy "tenant_members_select"
  on public.tenant_members
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or (
        (select authz.check_permission_version())
        and (
          (
            user_id = (select auth.uid())
            and tenant_id = (select authz.current_tenant_id())
          )
          or (
            tenant_id = (select authz.current_tenant_id())
            and (
              (select authz.has_permission('tenant_members.manage'::text))
              or (select authz.has_permission('tenant_members.read'::text))
            )
          )
        )
        and not (select authz.tenant_member_has_platform_role(tenant_members.id))
      )
    )
  );

create policy "tenant_members_update"
  on public.tenant_members
  for update
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('tenant_members.manage'::text))
        and (select authz.check_permission_version())
        and not (select authz.tenant_member_has_platform_role(tenant_members.id))
      )
    )
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('tenant_members.manage'::text))
        and (select authz.check_permission_version())
        and not (select authz.tenant_member_has_platform_role(tenant_members.id))
      )
    )
  );

create policy "tenant_members_delete"
  on public.tenant_members
  for delete
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('tenant_members.manage'::text))
        and (select authz.check_permission_version())
        and not (select authz.tenant_member_has_platform_role(tenant_members.id))
      )
    )
  );

drop policy if exists "tenant_member_roles_select" on authz.tenant_member_roles;

create policy "tenant_member_roles_select"
  on authz.tenant_member_roles
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and exists (
      select 1
      from public.tenant_members tm
      where tm.id = tenant_member_roles.tenant_member_id
        and (
          (select authz.is_system_admin())
          or (
            (select authz.check_permission_version())
            and tm.tenant_id = (select authz.current_tenant_id())
            and (
              tm.user_id = (select auth.uid())
              or (select authz.has_permission('tenant_members.manage'::text))
            )
            and not (select authz.tenant_member_has_platform_role(tm.id))
          )
        )
    )
    and (
      (select authz.is_system_admin())
      or not exists (
        select 1
        from authz.tenant_roles r
        where r.id = tenant_member_roles.tenant_role_id
          and r.template_key is not null
          and authz.role_template_scope(r.template_key) = 'platform'::authz.permission_scope
      )
    )
  );
