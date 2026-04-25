-- Tenant-scoped users must not read, assign, remove, or activate the
-- `platform_admin` tenant role unless they are system administrators.

-- --------------------------------------------------------------------------
-- authz.tenant_roles: hide platform_admin row from non–system-admins
-- --------------------------------------------------------------------------
drop policy if exists "roles_select_authenticated" on "authz"."tenant_roles";

create policy "roles_select_authenticated" on "authz"."tenant_roles" for select to "authenticated" using (
  (select authz.is_session_valid())
  and (not (select authz.is_account_locked()))
  and (
    (select authz.is_system_admin())
    or (
      "tenant_id" = (select authz.current_tenant_id())
      and "slug" is distinct from 'platform_admin'
    )
  )
);

-- --------------------------------------------------------------------------
-- authz.tenant_member_roles: block assign/remove platform_admin for non–system-admins
-- --------------------------------------------------------------------------
drop policy if exists "tenant_member_roles_insert" on "authz"."tenant_member_roles";

create policy "tenant_member_roles_insert" on "authz"."tenant_member_roles" for insert to "authenticated" with check (
  (select authz.is_session_valid())
  and (not (select authz.is_account_locked()))
  and (select authz.check_permission_version())
  and (select authz.has_permission('tenant_members.manage'::text))
  and (
    (select authz.is_system_admin())
    or not exists (
      select 1
      from authz.tenant_roles r
      where r.id = "tenant_member_roles"."tenant_role_id"
        and r.slug = 'platform_admin'
    )
  )
  and exists (
    select 1
    from public.tenant_members tm
    join authz.tenant_roles r on r.id = "tenant_member_roles"."tenant_role_id"
    where tm.id = "tenant_member_roles"."tenant_member_id"
      and tm.tenant_id = (select authz.current_tenant_id())
      and r.tenant_id = tm.tenant_id
  )
);

drop policy if exists "tenant_member_roles_delete" on "authz"."tenant_member_roles";

create policy "tenant_member_roles_delete" on "authz"."tenant_member_roles" for delete to "authenticated" using (
  (select authz.is_session_valid())
  and (not (select authz.is_account_locked()))
  and (select authz.check_permission_version())
  and (select authz.has_permission('tenant_members.manage'::text))
  and exists (
    select 1
    from public.tenant_members tm
    where tm.id = "tenant_member_roles"."tenant_member_id"
      and tm.tenant_id = (select authz.current_tenant_id())
  )
  and (
    (select authz.is_system_admin())
    or not exists (
      select 1
      from authz.tenant_roles r
      where r.id = "tenant_member_roles"."tenant_role_id"
        and r.slug = 'platform_admin'
    )
  )
);

-- --------------------------------------------------------------------------
-- RPC: cannot activate platform_admin without system admin
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
  if p_role_slug = 'platform_admin'
     and not exists (
       select 1
       from public.profiles p
       where p.id = p_user_id
         and p.is_system_admin
     ) then
    raise exception 'Only system administrators may activate the platform admin role';
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

-- --------------------------------------------------------------------------
-- RPC: sync_tenant_member_roles — block platform_admin for non–system-admins
-- --------------------------------------------------------------------------
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
    if 'platform_admin' = any(p_role_slugs) then
      raise exception 'platform_admin role can only be assigned by system administrators';
    end if;
    if p_active_role_slug is not null and p_active_role_slug = 'platform_admin' then
      raise exception 'platform_admin role can only be activated by system administrators';
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
