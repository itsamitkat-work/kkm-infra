-- ==========================================================================
-- Migration: Basic Rates — Annotations (attributes on items)
-- ==========================================================================
-- Optional notes attached to a basic rate row, mirroring schedule_item_annotations.
-- JSON shape: attributes: [{ "type": "note", "note": "..." }, ...]
-- ==========================================================================

create table public.basic_rate_annotations (
  id uuid primary key default gen_random_uuid(),
  basic_rate_id uuid not null references public.basic_rates(id) on delete cascade,
  type public.schedule_annotation_type not null default 'note',
  raw_text text not null,
  order_index int,
  created_at timestamptz default now()
);

create index idx_basic_rate_annotations_basic_rate
  on public.basic_rate_annotations(basic_rate_id);
