-- ==========================================================================
-- Migration: Auth Functions, Triggers, and RLS Helpers
-- ==========================================================================
-- Contains:
--   1. Utility triggers (updated_at, new user profile, new tenant roles)
--   2. authz.* helper functions used by RLS policies (JWT claim readers)
--   3. Permission version management (bump on role/permission changes)
--   4. Audit log capture trigger
--   5. Privilege escalation guard (protect_system_admin_flag)
-- ==========================================================================

-- Generic BEFORE UPDATE trigger to keep updated_at current
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create a profile when a new auth.users row is inserted
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_claims jsonb;
begin
  jwt_claims := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb;

  insert into private.audit_logs (
    user_id,
    tenant_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data,
    ip_address
  )
  values (
    nullif(jwt_claims ->> 'sub', '')::uuid,
    nullif(jwt_claims ->> 'tid', '')::uuid,
    lower(tg_op),
    tg_table_schema || '.' || tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    nullif(jwt_claims ->> 'ip_address', '')::inet
  );

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------
-- JWT claim reader functions (used in RLS policies)
-- All are STABLE + SECURITY DEFINER so they can be safely called
-- from RLS without granting table access to `authenticated`.
-- -----------------------------------------------------------------------

create or replace function authz.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nullif((select auth.jwt()) ->> 'tid', '')::uuid;
$$;

create or replace function authz.current_session_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nullif((select auth.jwt()) ->> 'sid', '')::uuid;
$$;

create or replace function authz.current_active_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif((select auth.jwt()) ->> 'active_role', '');
$$;

-- DB-driven permission check. Resolves permissions from the active role
-- via role_permissions join instead of reading from JWT. This keeps the
-- JWT small (no perms array) and scales to unlimited permissions.
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
    from authz.role_permissions rp
    join authz.permissions perm on perm.id = rp.permission_id
    where rp.role_id = v_active_role_id
      and perm.key = p
  );
end;
$$;

create or replace function authz.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'is_system_admin')::boolean, false);
$$;

create or replace function authz.is_session_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'session_revoked')::boolean, false) = false;
$$;

create or replace function authz.is_account_locked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'is_locked')::boolean, false);
$$;

-- Compares the JWT's pv claim against the DB permission_version.
-- Returns false if the JWT is stale, forcing a token refresh.
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

create or replace function authz.bump_permission_version(p_tenant_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tenant_members
  set permission_version = permission_version + 1,
      updated_at = now()
  where id = p_tenant_member_id;
end;
$$;

create or replace function authz.on_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.bump_permission_version(coalesce(new.tenant_member_id, old.tenant_member_id));
  return coalesce(new, old);
end;
$$;

create or replace function authz.on_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_role_id uuid;
begin
  changed_role_id := coalesce(new.role_id, old.role_id);

  update public.tenant_members tm
  set permission_version = tm.permission_version + 1,
      updated_at = now()
  where exists (
    select 1
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = tm.id
      and tmr.role_id = changed_role_id
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_new_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sr record;
begin
  for sr in
    select key, name
    from authz.system_roles
    order by name
  loop
    insert into authz.roles (tenant_id, name, slug, system_role_key, is_system)
    values (new.id, sr.name, sr.key, sr.key, true)
    on conflict (tenant_id, slug) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.handle_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists set_tenant_members_updated_at on public.tenant_members;
create trigger set_tenant_members_updated_at
before update on public.tenant_members
for each row execute function public.handle_updated_at();

drop trigger if exists set_roles_updated_at on authz.roles;
create trigger set_roles_updated_at
before update on authz.roles
for each row execute function public.handle_updated_at();

drop trigger if exists set_user_risk_scores_updated_at on private.user_risk_scores;
create trigger set_user_risk_scores_updated_at
before update on private.user_risk_scores
for each row execute function public.handle_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop trigger if exists on_tenant_created on public.tenants;
create trigger on_tenant_created
after insert on public.tenants
for each row execute function public.handle_new_tenant();

drop trigger if exists bump_pv_on_member_role_change on authz.tenant_member_roles;
create trigger bump_pv_on_member_role_change
after insert or delete on authz.tenant_member_roles
for each row execute function authz.on_member_role_change();

drop trigger if exists bump_pv_on_role_permission_change on authz.role_permissions;
create trigger bump_pv_on_role_permission_change
after insert or delete on authz.role_permissions
for each row execute function authz.on_role_permission_change();

drop trigger if exists audit_tenants on public.tenants;
create trigger audit_tenants
after insert or update or delete on public.tenants
for each row execute function private.capture_audit_log();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
after insert or update or delete on public.profiles
for each row execute function private.capture_audit_log();

drop trigger if exists audit_tenant_members on public.tenant_members;
create trigger audit_tenant_members
after insert or update or delete on public.tenant_members
for each row execute function private.capture_audit_log();

drop trigger if exists audit_roles on authz.roles;
create trigger audit_roles
after insert or update or delete on authz.roles
for each row execute function private.capture_audit_log();

drop trigger if exists audit_role_permissions on authz.role_permissions;
create trigger audit_role_permissions
after insert or update or delete on authz.role_permissions
for each row execute function private.capture_audit_log();

drop trigger if exists audit_tenant_member_roles on authz.tenant_member_roles;
create trigger audit_tenant_member_roles
after insert or update or delete on authz.tenant_member_roles
for each row execute function private.capture_audit_log();

grant execute on function authz.current_tenant_id() to authenticated;
grant execute on function authz.current_session_id() to authenticated;
grant execute on function authz.current_active_role() to authenticated;
grant execute on function authz.has_permission(text) to authenticated;
grant execute on function authz.is_system_admin() to authenticated;
grant execute on function authz.is_session_valid() to authenticated;
grant execute on function authz.is_account_locked() to authenticated;
grant execute on function authz.check_permission_version() to authenticated;

-- SECURITY: Prevents privilege escalation via profiles.is_system_admin.
-- Without this trigger, any authenticated user could UPDATE their own
-- profile to set is_system_admin=true and gain full system admin access
-- on the next token refresh (since the custom_access_token_hook reads
-- this column). Only callers whose JWT already contains is_system_admin=true
-- are allowed to modify this column.
create or replace function public.protect_system_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  if new.is_system_admin is distinct from old.is_system_admin then
    caller_is_admin := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'is_system_admin')::boolean,
      false
    );

    if not caller_is_admin then
      raise exception 'Only system admins can modify is_system_admin'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profiles_system_admin on public.profiles;
create trigger protect_profiles_system_admin
before update on public.profiles
for each row execute function public.protect_system_admin_flag();

-- SECURITY: The authenticated role has USAGE on the authz schema (needed
-- for the RLS helper functions above) but must NOT have table-level
-- access. This revoke ensures no future default privilege or migration
-- accidentally exposes role/permission data to regular users.
revoke all on all tables in schema authz from authenticated;

grant execute on function authz.bump_permission_version(uuid) to service_role;
grant execute on function authz.on_member_role_change() to service_role;
grant execute on function authz.on_role_permission_change() to service_role;
grant execute on function public.handle_new_tenant() to service_role;
grant execute on function private.capture_audit_log() to service_role;
