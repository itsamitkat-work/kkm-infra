-- ==========================================================================
-- RLS for authz.roles (tenant-scoped read) and authz.tenant_member_roles
-- (tenant members + managers can read; tenant_members.manage for writes).
-- Enables the web app to manage role assignments via Supabase client.
-- ==========================================================================

alter table authz.roles enable row level security;

drop policy if exists roles_select_authenticated on authz.roles;
create policy roles_select_authenticated
on authz.roles
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or tenant_id = (select authz.current_tenant_id())
  )
);

grant select, insert, delete on authz.tenant_member_roles to authenticated;

alter table authz.tenant_member_roles enable row level security;

drop policy if exists tenant_member_roles_select on authz.tenant_member_roles;
create policy tenant_member_roles_select
on authz.tenant_member_roles
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
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
            or (select authz.has_permission('tenant_members.manage'))
          )
        )
      )
  )
);

drop policy if exists tenant_member_roles_insert on authz.tenant_member_roles;
create policy tenant_member_roles_insert
on authz.tenant_member_roles
for insert
to authenticated
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.check_permission_version())
  and (select authz.has_permission('tenant_members.manage'))
  and exists (
    select 1
    from public.tenant_members tm
    join authz.roles r on r.id = tenant_member_roles.role_id
    where tm.id = tenant_member_roles.tenant_member_id
      and tm.tenant_id = (select authz.current_tenant_id())
      and r.tenant_id = tm.tenant_id
  )
);

drop policy if exists tenant_member_roles_delete on authz.tenant_member_roles;
create policy tenant_member_roles_delete
on authz.tenant_member_roles
for delete
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.check_permission_version())
  and (select authz.has_permission('tenant_members.manage'))
  and exists (
    select 1
    from public.tenant_members tm
    where tm.id = tenant_member_roles.tenant_member_id
      and tm.tenant_id = (select authz.current_tenant_id())
  )
);
