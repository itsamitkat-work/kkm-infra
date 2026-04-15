-- ==========================================================================
-- Migration: Basic Rates — RLS Policies
-- ==========================================================================
-- Access model:
--   SELECT: authenticated users with valid, unlocked session
--   INSERT/UPDATE/DELETE: system admins OR schedules.manage permission
-- ==========================================================================

alter table public.basic_rate_types enable row level security;
alter table public.basic_rates enable row level security;

create policy "basic_rate_types_select" on public.basic_rate_types
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "basic_rate_types_insert" on public.basic_rate_types
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rate_types_update" on public.basic_rate_types
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rate_types_delete" on public.basic_rate_types
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rates_select" on public.basic_rates
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "basic_rates_insert" on public.basic_rates
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rates_update" on public.basic_rates
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rates_delete" on public.basic_rates
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );
