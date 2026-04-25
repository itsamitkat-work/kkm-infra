-- Grants + RLS so authenticated clients can read the permission catalog, manage
-- tenant role ↔ permission links, and CRUD custom tenant_roles. Global role
-- templates remain system-admin only.

-- Reserved slug check for policies (tenant users cannot SELECT role_templates).
create or replace function authz.is_reserved_role_template_key(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from authz.role_templates rt
    where rt.key = p_key
  );
$$;

alter function authz.is_reserved_role_template_key(text) owner to postgres;

revoke all on function authz.is_reserved_role_template_key(text) from public;
grant execute on function authz.is_reserved_role_template_key(text) to authenticated;

-- --------------------------------------------------------------------------
-- authz.permissions (catalog)
-- --------------------------------------------------------------------------
alter table authz.permissions enable row level security;

grant select on table authz.permissions to authenticated;

create policy "permissions_select_authenticated"
  on authz.permissions
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
  );

-- --------------------------------------------------------------------------
-- authz.tenant_role_permissions
-- --------------------------------------------------------------------------
alter table authz.tenant_role_permissions enable row level security;

grant select, insert, delete on table authz.tenant_role_permissions to authenticated;

create policy "tenant_role_permissions_select_authenticated"
  on authz.tenant_role_permissions
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and exists (
      select 1
      from authz.tenant_roles tr
      where tr.id = tenant_role_permissions.tenant_role_id
        and tr.tenant_id = (select authz.current_tenant_id())
    )
    and (
      (select authz.is_system_admin())
      or (select authz.has_permission('tenant_roles.read'::text))
      or (select authz.has_permission('tenant_roles.manage'::text))
    )
  );

create policy "tenant_role_permissions_insert_authenticated"
  on authz.tenant_role_permissions
  for insert
  to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_roles.manage'::text))
    and exists (
      select 1
      from authz.tenant_roles tr
      where tr.id = tenant_role_permissions.tenant_role_id
        and tr.tenant_id = (select authz.current_tenant_id())
    )
    and (
      (select authz.is_system_admin())
      or not exists (
        select 1
        from authz.tenant_roles tr
        where tr.id = tenant_role_permissions.tenant_role_id
          and tr.slug = 'platform_admin'
      )
    )
  );

create policy "tenant_role_permissions_delete_authenticated"
  on authz.tenant_role_permissions
  for delete
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_roles.manage'::text))
    and exists (
      select 1
      from authz.tenant_roles tr
      where tr.id = tenant_role_permissions.tenant_role_id
        and tr.tenant_id = (select authz.current_tenant_id())
    )
    and (
      (select authz.is_system_admin())
      or not exists (
        select 1
        from authz.tenant_roles tr
        where tr.id = tenant_role_permissions.tenant_role_id
          and tr.slug = 'platform_admin'
      )
    )
  );

-- --------------------------------------------------------------------------
-- authz.tenant_roles — INSERT / UPDATE / DELETE (SELECT policy unchanged)
-- --------------------------------------------------------------------------
grant insert, update, delete on table authz.tenant_roles to authenticated;

create policy "tenant_roles_insert_authenticated"
  on authz.tenant_roles
  for insert
  to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_roles.manage'::text))
    and tenant_id = (select authz.current_tenant_id())
    and is_system = false
    and template_key is null
    and slug ~ '^[a-z0-9_]+$'
    and (not authz.is_reserved_role_template_key(tenant_roles.slug))
  );

create policy "tenant_roles_update_custom_authenticated"
  on authz.tenant_roles
  for update
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_roles.manage'::text))
    and tenant_id = (select authz.current_tenant_id())
    and is_system = false
  )
  with check (
    tenant_id = (select authz.current_tenant_id())
    and is_system = false
    and template_key is null
    and slug ~ '^[a-z0-9_]+$'
    and (not authz.is_reserved_role_template_key(tenant_roles.slug))
  );

create policy "tenant_roles_delete_custom_authenticated"
  on authz.tenant_roles
  for delete
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_roles.manage'::text))
    and tenant_id = (select authz.current_tenant_id())
    and is_system = false
  );

-- --------------------------------------------------------------------------
-- authz.role_templates + role_template_permissions (system admin only)
-- --------------------------------------------------------------------------
alter table authz.role_templates enable row level security;
alter table authz.role_template_permissions enable row level security;

grant select, insert, update, delete on table authz.role_templates to authenticated;
grant select, insert, update, delete on table authz.role_template_permissions to authenticated;

create policy "role_templates_all_system_admin"
  on authz.role_templates
  for all
  to authenticated
  using ((select authz.is_system_admin()))
  with check ((select authz.is_system_admin()));

create policy "role_template_permissions_all_system_admin"
  on authz.role_template_permissions
  for all
  to authenticated
  using ((select authz.is_system_admin()))
  with check ((select authz.is_system_admin()));
