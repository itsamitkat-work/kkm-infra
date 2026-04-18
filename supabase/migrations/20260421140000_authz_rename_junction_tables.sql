-- Align authz naming with tenant_roles:
--   role_permissions          -> tenant_role_permissions
--   role_id on junction tables -> tenant_role_id (FK to tenant_roles.id)
-- authz.permissions stays as the global permission catalog (no tenant_id).

begin;

alter table authz.role_permissions rename to tenant_role_permissions;

alter index if exists authz.idx_role_permissions_permission_id
  rename to idx_tenant_role_permissions_permission_id;

alter table authz.tenant_role_permissions
  rename column role_id to tenant_role_id;

alter table authz.tenant_member_roles
  rename column role_id to tenant_role_id;

alter index if exists authz.idx_tenant_member_roles_role
  rename to idx_tenant_member_roles_tenant_role;

drop trigger if exists bump_pv_on_role_permission_change on authz.tenant_role_permissions;
create trigger bump_pv_on_role_permission_change
after insert or delete on authz.tenant_role_permissions
for each row execute function authz.on_role_permission_change();

drop trigger if exists audit_role_permissions on authz.tenant_role_permissions;
create trigger audit_role_permissions
after insert or update or delete on authz.tenant_role_permissions
for each row execute function private.capture_audit_log();

create or replace function authz.on_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_role_id uuid;
begin
  changed_role_id := coalesce(new.tenant_role_id, old.tenant_role_id);

  update public.tenant_members tm
  set permission_version = tm.permission_version + 1,
      updated_at = now()
  where exists (
    select 1
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = tm.id
      and tmr.tenant_role_id = changed_role_id
  );

  return coalesce(new, old);
end;
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

create or replace function public.check_user_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active_role_id uuid;
begin
  select tm.active_role_id
  into v_active_role_id
  from public.tenant_members tm
  where tm.user_id = p_user_id
    and tm.tenant_id = p_tenant_id
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
      and perm.key = p_permission_key
  );
end;
$$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  v_user_id uuid;
  session_id uuid;
  session_tenant_id uuid;
  membership record;
  assigned_role_slugs text[];
  active_role_slug text;
  is_admin boolean;
  is_locked boolean;
  is_revoked boolean;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  v_user_id := nullif(event ->> 'user_id', '')::uuid;
  session_id := nullif(claims ->> 'session_id', '')::uuid;

  select p.is_system_admin
  into is_admin
  from public.profiles p
  where p.id = v_user_id;

  select urs.is_locked
  into is_locked
  from private.user_risk_scores urs
  where urs.user_id = v_user_id;

  if session_id is not null then
    select s.tenant_id, s.is_revoked or s.expires_at <= now()
    into session_tenant_id, is_revoked
    from private.auth_sessions s
    where s.id = session_id;
  end if;

  claims := jsonb_set(claims, '{is_system_admin}', to_jsonb(coalesce(is_admin, false)), true);
  claims := jsonb_set(claims, '{sid}', coalesce(to_jsonb(session_id), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{session_revoked}', to_jsonb(coalesce(is_revoked, false)), true);
  claims := jsonb_set(claims, '{is_locked}', to_jsonb(coalesce(is_locked, false)), true);

  select
    tm.id,
    tm.tenant_id,
    tm.permission_version,
    tm.active_role_id
  into membership
  from public.tenant_members tm
  where tm.user_id = v_user_id
    and tm.status = 'active'
  order by
    case when tm.tenant_id = session_tenant_id then 0 else 1 end,
    tm.created_at asc
  limit 1;

  if membership.id is null then
    claims := jsonb_set(claims, '{tid}', 'null'::jsonb, true);
    claims := jsonb_set(claims, '{active_role}', 'null'::jsonb, true);
    claims := jsonb_set(claims, '{roles}', '[]'::jsonb, true);
    claims := jsonb_set(claims, '{pv}', '0'::jsonb, true);
    return jsonb_set(event, '{claims}', claims, true);
  end if;

  select coalesce(array_agg(r.slug order by r.name), '{}'::text[])
  into assigned_role_slugs
  from authz.tenant_member_roles tmr
  join authz.tenant_roles r on r.id = tmr.tenant_role_id
  where tmr.tenant_member_id = membership.id;

  if membership.active_role_id is null and cardinality(assigned_role_slugs) = 1 then
    select tmr.tenant_role_id
    into membership.active_role_id
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = membership.id
    limit 1;

    update public.tenant_members tm
    set active_role_id = membership.active_role_id
    where tm.id = membership.id;
  end if;

  if membership.active_role_id is not null then
    select r.slug
    into active_role_slug
    from authz.tenant_roles r
    where r.id = membership.active_role_id;
  end if;

  claims := jsonb_set(claims, '{tid}', coalesce(to_jsonb(membership.tenant_id), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{active_role}', coalesce(to_jsonb(active_role_slug), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{roles}', coalesce(to_jsonb(assigned_role_slugs), '[]'::jsonb), true);
  claims := jsonb_set(claims, '{pv}', coalesce(to_jsonb(membership.permission_version), '0'::jsonb), true);

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

create or replace function public.sync_tenant_member_roles(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role_slugs text[],
  p_active_role_slug text default null,
  p_display_name text default null,
  p_avatar_url text default null
)
returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  desired_role_ids uuid[];
  resolved_active_role_id uuid;
begin
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
  from unnest(desired_role_ids) desired_role_id
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

create or replace function public.switch_active_role(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role_slug text
)
returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  v_role_id uuid;
begin
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
    join authz.tenant_roles r on r.id = tenant_member_roles.tenant_role_id
    where tm.id = tenant_member_roles.tenant_member_id
      and tm.tenant_id = (select authz.current_tenant_id())
      and r.tenant_id = tm.tenant_id
  )
);

commit;
