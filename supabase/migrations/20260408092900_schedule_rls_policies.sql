-- ==========================================================================
-- Migration: Schedule of Rates — RLS Policies
-- ==========================================================================
-- Access model:
--   SELECT: all authenticated users with valid, unlocked session
--   INSERT/UPDATE: system admins OR users with 'schedules.manage' permission
--   DELETE (sources/versions only): system admins only
--
-- Uses authz.is_session_valid(), authz.is_account_locked(),
-- authz.is_system_admin(), and authz.has_permission() from auth migrations.
-- ==========================================================================

-- ── Enable RLS ───────────────────────────────────────────────────────────

alter table public.schedule_sources enable row level security;
alter table public.schedule_source_versions enable row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_item_rates enable row level security;
alter table public.schedule_item_annotations enable row level security;
alter table public.units enable row level security;
alter table public.derived_units enable row level security;
alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.schedule_item_attributes enable row level security;

-- ── schedule_sources ─────────────────────────────────────────────────────

create policy "schedule_sources_select" on public.schedule_sources
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_sources_insert" on public.schedule_sources
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_sources_update" on public.schedule_sources
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_sources_delete" on public.schedule_sources
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- ── schedule_source_versions ─────────────────────────────────────────────

create policy "schedule_source_versions_select" on public.schedule_source_versions
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_source_versions_insert" on public.schedule_source_versions
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_source_versions_update" on public.schedule_source_versions
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_source_versions_delete" on public.schedule_source_versions
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- ── schedule_items ───────────────────────────────────────────────────────

create policy "schedule_items_select" on public.schedule_items
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_items_insert" on public.schedule_items
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_items_update" on public.schedule_items
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_items_delete" on public.schedule_items
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- ── schedule_item_rates ──────────────────────────────────────────────────

create policy "schedule_item_rates_select" on public.schedule_item_rates
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_rates_insert" on public.schedule_item_rates
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_rates_update" on public.schedule_item_rates
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_rates_delete" on public.schedule_item_rates
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- ── schedule_item_annotations ────────────────────────────────────────────

create policy "schedule_item_annotations_select" on public.schedule_item_annotations
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_annotations_insert" on public.schedule_item_annotations
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_annotations_update" on public.schedule_item_annotations
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_annotations_delete" on public.schedule_item_annotations
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- ── units ────────────────────────────────────────────────────────────────

create policy "units_select" on public.units
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "units_insert" on public.units
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

create policy "units_update" on public.units
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

create policy "units_delete" on public.units
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- ── derived_units ────────────────────────────────────────────────────────

create policy "derived_units_select" on public.derived_units
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "derived_units_insert" on public.derived_units
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

create policy "derived_units_update" on public.derived_units
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

create policy "derived_units_delete" on public.derived_units
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- ── attributes ───────────────────────────────────────────────────────────

create policy "attributes_select" on public.attributes
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "attributes_insert" on public.attributes
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "attributes_update" on public.attributes
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "attributes_delete" on public.attributes
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- ── attribute_values ─────────────────────────────────────────────────────

create policy "attribute_values_select" on public.attribute_values
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "attribute_values_insert" on public.attribute_values
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "attribute_values_update" on public.attribute_values
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "attribute_values_delete" on public.attribute_values
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- ── schedule_item_attributes ─────────────────────────────────────────────

create policy "schedule_item_attributes_select" on public.schedule_item_attributes
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_attributes_insert" on public.schedule_item_attributes
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_attributes_update" on public.schedule_item_attributes
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_attributes_delete" on public.schedule_item_attributes
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );
