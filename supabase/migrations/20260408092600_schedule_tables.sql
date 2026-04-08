-- ==========================================================================
-- Migration: Schedule of Rates — Tables
-- ==========================================================================
-- Creates all tables for the schedule-of-rates domain:
--   - units, derived_units (measurement system)
--   - schedule_sources, schedule_source_versions (publishers & editions)
--   - schedule_items (hierarchical ltree nodes)
--   - schedule_item_rates, schedule_item_annotations (item details)
--   - attributes, attribute_values, schedule_item_attributes (tagging)
--
-- Tables reference public.record_status, public.schedule_node_type, etc.
-- created in the previous migration.
-- ==========================================================================

-- ── Measurement units ────────────────────────────────────────────────────

create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  symbol text not null,
  dimension text not null,
  is_base boolean default false,
  conversion_factor numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(symbol),
  unique(name)
);

create table public.derived_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  numerator_unit_id uuid references public.units(id),
  denominator_unit_id uuid references public.units(id),
  multiplier numeric default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(name)
);

-- ── Schedule sources & versions ──────────────────────────────────────────

create table public.schedule_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  type public.schedule_source_type,
  status public.record_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(name)
);

create table public.schedule_source_versions (
  id uuid primary key default gen_random_uuid(),
  schedule_source_id uuid not null references public.schedule_sources(id) on delete cascade,
  name text not null,
  display_name text not null,
  year int,
  region text,
  metadata jsonb,
  status public.record_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(schedule_source_id, name)
);

-- ── Schedule items (ltree hierarchy) ─────────────────────────────────────

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_source_version_id uuid not null
    references public.schedule_source_versions(id) on delete cascade,
  parent_item_id uuid references public.schedule_items(id) on delete cascade,
  path ltree not null,
  slug text not null,
  code text not null,
  description text not null,
  node_type public.schedule_node_type not null,
  unit_id uuid references public.units(id),
  derived_unit_id uuid references public.derived_units(id),
  check (
    (unit_id is null and derived_unit_id is null) or
    (unit_id is not null and derived_unit_id is null) or
    (unit_id is null and derived_unit_id is not null)
  ),
  rate numeric,
  check (
    (parent_item_id is null and node_type = 'section')
    or (parent_item_id is not null)
  ),
  item_type text default 'base',
  order_index int,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(code, ''))
  ) stored,
  ingestion_batch_id uuid,
  source_page_number int,
  status public.record_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(schedule_source_version_id, parent_item_id, code)
);

-- ── Item rates & annotations ─────────────────────────────────────────────

create table public.schedule_item_rates (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  context text not null,
  rate numeric not null,
  created_at timestamptz default now(),
  unique(schedule_item_id, context)
);

create table public.schedule_item_annotations (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  type public.schedule_annotation_type not null default 'note',
  raw_text text not null,
  order_index int,
  created_at timestamptz default now()
);

-- ── Attributes (populated post-ingestion) ────────────────────────────────

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  data_type text not null,
  dimension text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(name)
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value_text text,
  value_number numeric,
  unit_id uuid references public.units(id),
  normalized_value numeric,
  normalized_unit_id uuid references public.units(id),
  created_at timestamptz default now()
);

create table public.schedule_item_attributes (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  attribute_value_id uuid not null
    references public.attribute_values(id) on delete cascade,
  source text default 'manual',
  confidence numeric default 1.0,
  created_by uuid,
  status public.record_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
