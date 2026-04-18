-- ==========================================================================
-- Migration: Clients — system admin creates under default platform tenant
-- ==========================================================================
-- When profiles.is_system_admin (JWT) is true, new clients get tenant_id
-- from the default platform tenant via authz.default_platform_tenant_id().
-- Mirrors the projects equivalent in 20260418100200.
-- ==========================================================================

create or replace function public.clients_set_tenant_before_insert()
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
      raise exception 'no tenants exist; cannot assign default tenant for client';
    end if;
    new.tenant_id := v_default;
    return new;
  end if;

  v_tid := (select authz.current_tenant_id());
  if v_tid is null then
    raise exception 'tenant context required to create a client';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;
