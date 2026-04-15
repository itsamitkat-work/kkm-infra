-- ==========================================================================
-- Migration: Basic rate annotations — RLS uses basic_rates.* permissions
-- ==========================================================================

drop policy if exists "basic_rate_annotations_select" on public.basic_rate_annotations;
drop policy if exists "basic_rate_annotations_insert" on public.basic_rate_annotations;
drop policy if exists "basic_rate_annotations_update" on public.basic_rate_annotations;
drop policy if exists "basic_rate_annotations_delete" on public.basic_rate_annotations;

create policy "basic_rate_annotations_select" on public.basic_rate_annotations
  for select to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (
      authz.is_system_admin()
      or authz.has_permission('basic_rates.read')
      or authz.has_permission('basic_rates.manage')
    )
  );

create policy "basic_rate_annotations_insert" on public.basic_rate_annotations
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rate_annotations_update" on public.basic_rate_annotations
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rate_annotations_delete" on public.basic_rate_annotations
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );
