-- ==========================================================================
-- Migration: Basic Rate Annotations — RLS
-- ==========================================================================

alter table public.basic_rate_annotations enable row level security;

create policy "basic_rate_annotations_select" on public.basic_rate_annotations
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "basic_rate_annotations_insert" on public.basic_rate_annotations
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rate_annotations_update" on public.basic_rate_annotations
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "basic_rate_annotations_delete" on public.basic_rate_annotations
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );
