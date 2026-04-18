-- Rename members.manage -> tenant_members.manage and refresh tenant_members RLS
-- (policy quals embed the permission key string; updating authz.permissions alone is not enough).

update authz.permissions
set
  key = 'tenant_members.manage',
  description = 'Add, update, suspend, and remove tenant members'
where key = 'members.manage';

drop policy if exists tenant_members_select on public.tenant_members;
create policy tenant_members_select
on public.tenant_members
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      (select authz.check_permission_version())
      and (
        (user_id = (select auth.uid()) and tenant_id = (select authz.current_tenant_id()))
        or (
          tenant_id = (select authz.current_tenant_id())
          and (select authz.has_permission('tenant_members.manage'))
        )
      )
    )
  )
);

drop policy if exists tenant_members_insert on public.tenant_members;
create policy tenant_members_insert
on public.tenant_members
for insert
to authenticated
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);

drop policy if exists tenant_members_update on public.tenant_members;
create policy tenant_members_update
on public.tenant_members
for update
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
)
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);

drop policy if exists tenant_members_delete on public.tenant_members;
create policy tenant_members_delete
on public.tenant_members
for delete
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);
