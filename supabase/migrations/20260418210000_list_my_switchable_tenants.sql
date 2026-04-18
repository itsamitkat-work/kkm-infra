-- ==========================================================================
-- List active tenant memberships for the current user (all tenants).
-- RLS on tenant_members only exposes rows for the active tenant; this RPC
-- is intentionally scoped to the caller's own memberships for the tenant
-- switcher UI.
-- ==========================================================================

create or replace function public.list_my_switchable_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tm.tenant_id,
    coalesce(t.display_name, t.name) as tenant_name,
    t.slug as tenant_slug
  from public.tenant_members tm
  join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = (select auth.uid())
    and tm.status = 'active'
    and (select authz.is_session_valid())
    and not (select authz.is_account_locked());
$$;

grant execute on function public.list_my_switchable_tenants() to authenticated;
grant execute on function public.list_my_switchable_tenants() to service_role;
