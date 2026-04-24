-- Permission key strings for the caller's active tenant role (DB active_role_id + JWT tid).
-- Used by the web app for CASL; not embedded on the JWT.

drop function if exists public.session_permission_keys();

create or replace function public.session_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select array_agg(perm.key order by perm.key)
      from public.tenant_members tm
      join authz.tenant_role_permissions trp
        on trp.tenant_role_id = tm.active_role_id
      join authz.permissions perm
        on perm.id = trp.permission_id
      where tm.user_id = (select auth.uid())
        and tm.tenant_id = (select authz.current_tenant_id())
        and tm.status = 'active'::text
        and (select authz.current_tenant_id()) is not null
    ),
    '{}'::text[]
  );
$$;

alter function public.session_permissions() owner to postgres;

grant execute on function public.session_permissions() to authenticated;
