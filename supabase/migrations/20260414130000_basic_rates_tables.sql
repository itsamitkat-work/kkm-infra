-- ==========================================================================
-- Migration: Basic Rates — Tables
-- ==========================================================================
-- Creates normalized basic rate tables:
--   - basic_rate_types (deduplicated "type" values)
--   - basic_rates (schedule version scoped rates)
-- Notes:
--   - unit is stored as raw text from source JSON (no unit FK normalization)
-- ==========================================================================

create table public.basic_rate_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.basic_rates (
  id uuid primary key default gen_random_uuid(),
  schedule_source_version_id uuid not null
    references public.schedule_source_versions(id) on delete cascade,
  basic_rate_type_id uuid not null references public.basic_rate_types(id),
  code text not null,
  description text not null,
  unit text not null,
  rate numeric not null,
  status public.record_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(schedule_source_version_id, code)
);

create index idx_basic_rates_schedule_source_version
  on public.basic_rates(schedule_source_version_id);

create index idx_basic_rates_type
  on public.basic_rates(basic_rate_type_id);

create trigger set_updated_at before update on public.basic_rate_types
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.basic_rates
  for each row execute function public.handle_updated_at();
