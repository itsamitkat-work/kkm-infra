-- ==========================================================================
-- Migration: Schedule of Rates — Functions & Triggers
-- ==========================================================================
-- Contains:
--   1. uuid_to_short_id — converts UUID to ltree-safe hex label
--   2. compute_schedule_item_path — auto-computes ltree path and slug
--   3. updated_at triggers for all schedule tables
--   4. Audit triggers for schedule_sources and schedule_source_versions
-- ==========================================================================

-- Converts a UUID to a 12-char hex string safe for ltree labels.
-- 12 hex chars = 48 bits of entropy, collision-free within any realistic dataset.
create or replace function public.uuid_to_short_id(uid uuid)
returns text
language sql immutable
as $$
  select substr(replace(uid::text, '-', ''), 1, 12);
$$;

-- Auto-computes the ltree path from parent chain using short hex IDs.
-- Also auto-generates the slug from the code if not provided.
create or replace function public.compute_schedule_item_path()
returns trigger
language plpgsql
as $$
declare
  parent_path ltree;
  short_id text;
begin
  short_id := public.uuid_to_short_id(new.id);

  if new.slug is null or new.slug = '' then
    new.slug := regexp_replace(lower(new.code), '[^a-z0-9]+', '_', 'g');
    new.slug := trim(both '_' from new.slug);
  end if;

  if new.parent_item_id is null then
    new.path := text2ltree(short_id);
  else
    select si.path into parent_path
    from public.schedule_items si
    where si.id = new.parent_item_id;

    if parent_path is null then
      raise exception 'Parent item % not found', new.parent_item_id;
    end if;

    new.path := parent_path || text2ltree(short_id);
  end if;

  return new;
end;
$$;

create trigger trg_compute_path
  before insert or update of parent_item_id
  on public.schedule_items
  for each row execute function public.compute_schedule_item_path();

-- ── updated_at triggers ──────────────────────────────────────────────────

create trigger set_updated_at before update on public.schedule_sources
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_source_versions
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_items
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.units
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.derived_units
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.attributes
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_item_attributes
  for each row execute function public.handle_updated_at();

-- ── Audit triggers ──────────────────────────────────────────────────────
-- Only sources and versions are audited; individual items are bulk-ingested.

create trigger audit_schedule_sources
  after insert or update or delete on public.schedule_sources
  for each row execute function private.capture_audit_log();

create trigger audit_schedule_source_versions
  after insert or update or delete on public.schedule_source_versions
  for each row execute function private.capture_audit_log();
