-- Align clients INSERT RLS with projects (row tenant_id + shared helpers from
-- 20260422120000_projects_insert_rls_row_tenant.sql).

begin;

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (
      (select authz.is_system_admin())
      or (
        (select authz.check_permission_version_for_tenant(clients.tenant_id))
        and (select authz.has_permission_for_tenant(clients.tenant_id, 'clients.manage'))
      )
    )
  );

commit;
