-- ==========================================================================
-- Migration: Basic rates — RLS aligned with basic_rates.read / basic_rates.manage
-- ==========================================================================
-- Replaces schedules.manage checks on basic_rates / basic_rate_types.
--   SELECT: system admin OR basic_rates.read OR basic_rates.manage
--   INSERT/UPDATE/DELETE: system admin OR basic_rates.manage
-- ==========================================================================

drop policy if exists "basic_rate_types_select" on public.basic_rate_types;
drop policy if exists "basic_rate_types_insert" on public.basic_rate_types;
drop policy if exists "basic_rate_types_update" on public.basic_rate_types;
drop policy if exists "basic_rate_types_delete" on public.basic_rate_types;

drop policy if exists "basic_rates_select" on public.basic_rates;
drop policy if exists "basic_rates_insert" on public.basic_rates;
drop policy if exists "basic_rates_update" on public.basic_rates;
drop policy if exists "basic_rates_delete" on public.basic_rates;

create policy "basic_rate_types_select" on public.basic_rate_types
  for select to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (
      authz.is_system_admin()
      or authz.has_permission('basic_rates.read')
      or authz.has_permission('basic_rates.manage')
    )
  );

create policy "basic_rate_types_insert" on public.basic_rate_types
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rate_types_update" on public.basic_rate_types
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rate_types_delete" on public.basic_rate_types
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rates_select" on public.basic_rates
  for select to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (
      authz.is_system_admin()
      or authz.has_permission('basic_rates.read')
      or authz.has_permission('basic_rates.manage')
    )
  );

create policy "basic_rates_insert" on public.basic_rates
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rates_update" on public.basic_rates
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );

create policy "basic_rates_delete" on public.basic_rates
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('basic_rates.manage'))
  );
