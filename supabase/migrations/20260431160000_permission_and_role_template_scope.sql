-- Tenant vs platform scope for permissions and role templates.
-- Greenfield: replaces policies from 20260427120100 / 20260426200000 without editing those files.

-- --------------------------------------------------------------------------
-- Enum + columns
-- --------------------------------------------------------------------------
create type authz.permission_scope as enum ('tenant', 'platform');

alter table authz.permissions
  add column scope authz.permission_scope not null default 'tenant';

update authz.permissions
set scope = 'platform'::authz.permission_scope
where key = 'tenants.manage';

alter table authz.role_templates
  add column scope authz.permission_scope not null default 'tenant';

update authz.role_templates
set scope = 'platform'::authz.permission_scope
where key = 'platform_admin';

-- Tenant users cannot SELECT role_templates (system-admin only). Policies and
-- checks use this definer helper instead of joining role_templates.
create or replace function authz.role_template_scope(p_key text)
returns authz.permission_scope
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select rt.scope
      from authz.role_templates rt
      where rt.key = p_key
      limit 1
    ),
    'tenant'::authz.permission_scope
  );
$$;

alter function authz.role_template_scope(text) owner to postgres;

revoke all on function authz.role_template_scope(text) from public;
grant execute on function authz.role_template_scope(text) to authenticated;

create or replace function authz.permission_scope_by_id(p_id uuid)
returns authz.permission_scope
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.scope from authz.permissions p where p.id = p_id limit 1),
    'tenant'::authz.permission_scope
  );
$$;

alter function authz.permission_scope_by_id(uuid) owner to postgres;

revoke all on function authz.permission_scope_by_id(uuid) from public;
grant execute on function authz.permission_scope_by_id(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- authz.permissions (catalog)
-- --------------------------------------------------------------------------
drop policy if exists "permissions_select_authenticated" on authz.permissions;

create policy "permissions_select_authenticated"
  on authz.permissions
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or authz.permissions.scope = 'tenant'::authz.permission_scope
    )
  );

-- --------------------------------------------------------------------------
-- authz.tenant_role_permissions
-- --------------------------------------------------------------------------
drop policy if exists "tenant_role_permissions_select_authenticated" on authz.tenant_role_permissions;
drop policy if exists "tenant_role_permissions_insert_authenticated" on authz.tenant_role_permissions;
drop policy if exists "tenant_role_permissions_delete_authenticated" on authz.tenant_role_permissions;

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
      or (
        (select authz.permission_scope_by_id(tenant_role_permissions.permission_id))
          <> 'platform'::authz.permission_scope
        and not exists (
          select 1
          from authz.tenant_roles tr
          where tr.id = tenant_role_permissions.tenant_role_id
            and tr.template_key is not null
            and authz.role_template_scope(tr.template_key) = 'platform'::authz.permission_scope
        )
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
      or (
        (select authz.permission_scope_by_id(tenant_role_permissions.permission_id))
          <> 'platform'::authz.permission_scope
        and not exists (
          select 1
          from authz.tenant_roles tr
          where tr.id = tenant_role_permissions.tenant_role_id
            and tr.template_key is not null
            and authz.role_template_scope(tr.template_key) = 'platform'::authz.permission_scope
        )
      )
    )
  );

-- --------------------------------------------------------------------------
-- authz.tenant_roles (SELECT — template scope; supersedes slug-only filter)
-- --------------------------------------------------------------------------
drop policy if exists "roles_select_authenticated" on authz.tenant_roles;

create policy "roles_select_authenticated"
  on authz.tenant_roles
  for select
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (
          template_key is null
          or authz.role_template_scope(tenant_roles.template_key) = 'tenant'::authz.permission_scope
        )
      )
    )
  );

-- --------------------------------------------------------------------------
-- authz.tenant_member_roles — block platform template roles (any scope key)
-- --------------------------------------------------------------------------
drop policy if exists "tenant_member_roles_insert" on authz.tenant_member_roles;
drop policy if exists "tenant_member_roles_delete" on authz.tenant_member_roles;

create policy "tenant_member_roles_insert"
  on authz.tenant_member_roles
  for insert
  to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_members.manage'::text))
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
    and exists (
      select 1
      from public.tenant_members tm
      join authz.tenant_roles r on r.id = tenant_member_roles.tenant_role_id
      where tm.id = tenant_member_roles.tenant_member_id
        and tm.tenant_id = (select authz.current_tenant_id())
        and r.tenant_id = tm.tenant_id
    )
  );

create policy "tenant_member_roles_delete"
  on authz.tenant_member_roles
  for delete
  to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select authz.has_permission('tenant_members.manage'::text))
    and exists (
      select 1
      from public.tenant_members tm
      where tm.id = tenant_member_roles.tenant_member_id
        and tm.tenant_id = (select authz.current_tenant_id())
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

-- --------------------------------------------------------------------------
-- RPCs: platform role = any role_templates.scope = platform (slug = template key)
-- --------------------------------------------------------------------------
create or replace function public.switch_active_role(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role_slug text
) returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  v_role_id uuid;
begin
  if authz.role_template_scope(p_role_slug) = 'platform'::authz.permission_scope
     and not exists (
       select 1
       from public.profiles p
       where p.id = p_user_id
         and p.is_system_admin
     ) then
    raise exception 'Only system administrators may activate a platform-scoped role';
  end if;

  select tm.*
  into member_row
  from public.tenant_members tm
  where tm.user_id = p_user_id
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  if member_row.id is null then
    raise exception 'Active tenant membership not found';
  end if;

  select r.id
  into v_role_id
  from authz.tenant_roles r
  join authz.tenant_member_roles tmr on tmr.tenant_role_id = r.id
  where r.tenant_id = p_tenant_id
    and r.slug = p_role_slug
    and tmr.tenant_member_id = member_row.id
  limit 1;

  if v_role_id is null then
    raise exception 'Role is not assigned to the member';
  end if;

  update public.tenant_members tm
  set active_role_id = v_role_id,
      updated_at = now()
  where tm.id = member_row.id
  returning * into member_row;

  return member_row;
end;
$$;

create or replace function public.sync_tenant_member_roles(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role_slugs text[],
  p_active_role_slug text default null::text,
  p_display_name text default null::text,
  p_avatar_url text default null::text
) returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  desired_role_ids uuid[];
  resolved_active_role_id uuid;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.is_system_admin
  ) then
    if exists (
      select 1
      from unnest(p_role_slugs) as s(slug)
      where authz.role_template_scope(s.slug) = 'platform'::authz.permission_scope
    ) then
      raise exception 'Platform-scoped roles can only be assigned by system administrators';
    end if;
    if p_active_role_slug is not null
       and authz.role_template_scope(p_active_role_slug) = 'platform'::authz.permission_scope then
      raise exception 'Platform-scoped roles can only be activated by system administrators';
    end if;
  end if;

  if coalesce(array_length(p_role_slugs, 1), 0) = 0 then
    raise exception 'At least one role slug is required';
  end if;

  insert into public.tenant_members (
    tenant_id,
    user_id,
    display_name,
    avatar_url
  )
  values (
    p_tenant_id,
    p_user_id,
    p_display_name,
    p_avatar_url
  )
  on conflict (tenant_id, user_id) do update
  set display_name = coalesce(excluded.display_name, public.tenant_members.display_name),
      avatar_url = coalesce(excluded.avatar_url, public.tenant_members.avatar_url),
      status = 'active'
  returning * into member_row;

  select array_agg(r.id order by r.name)
  into desired_role_ids
  from authz.tenant_roles r
  where r.tenant_id = p_tenant_id
    and r.slug = any(p_role_slugs);

  if coalesce(array_length(desired_role_ids, 1), 0) <> array_length(p_role_slugs, 1) then
    raise exception 'One or more role slugs are invalid for the tenant';
  end if;

  delete from authz.tenant_member_roles tmr
  where tmr.tenant_member_id = member_row.id
    and not (tmr.tenant_role_id = any(desired_role_ids));

  insert into authz.tenant_member_roles (tenant_member_id, tenant_role_id)
  select member_row.id, desired_role_id
  from unnest(desired_role_ids) as desired_role_id
  on conflict do nothing;

  if p_active_role_slug is not null then
    select r.id
    into resolved_active_role_id
    from authz.tenant_roles r
    where r.tenant_id = p_tenant_id
      and r.slug = p_active_role_slug;
  else
    resolved_active_role_id := desired_role_ids[1];
  end if;

  if resolved_active_role_id is null or not (resolved_active_role_id = any(desired_role_ids)) then
    raise exception 'Active role must be one of the assigned roles';
  end if;

  update public.tenant_members tm
  set active_role_id = resolved_active_role_id,
      updated_at = now()
  where tm.id = member_row.id
  returning * into member_row;

  return member_row;
end;
$$;
