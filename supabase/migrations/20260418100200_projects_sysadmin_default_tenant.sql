-- ==========================================================================
-- Migration: Projects — system admin creates under default platform tenant
-- ==========================================================================
-- When profiles.is_system_admin (JWT) is true, new projects get tenant_id
-- from the default platform tenant:
--   1) First tenant (by created_at) with settings.platform_default = true
--   2) Else oldest tenant by created_at (stable fallback)
-- ==========================================================================

create or replace function authz.default_platform_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select t.id
      from public.tenants t
      where coalesce((t.settings ->> 'platform_default')::boolean, false)
      order by t.created_at asc
      limit 1
    ),
    (
      select t.id
      from public.tenants t
      order by t.created_at asc
      limit 1
    )
  );
$$;

grant execute on function authz.default_platform_tenant_id() to authenticated;

-- PostgREST-friendly wrapper (same return type as authz helper)
create or replace function public.default_platform_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, authz
as $$
  select authz.default_platform_tenant_id();
$$;

grant execute on function public.default_platform_tenant_id() to authenticated;

create or replace function public.projects_set_tenant_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, authz
as $$
declare
  v_tid uuid;
  v_default uuid;
begin
  if (select authz.is_system_admin()) then
    v_default := (select authz.default_platform_tenant_id());
    if v_default is null then
      raise exception 'no tenants exist; cannot assign default tenant for project';
    end if;
    new.tenant_id := v_default;
    return new;
  end if;

  v_tid := (select authz.current_tenant_id());
  if v_tid is null then
    raise exception 'tenant context required to create a project';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;
