-- ==========================================================================
-- Migration: Schedule of Rates — Indexes
-- ==========================================================================
-- Performance indexes for:
--   - ltree hierarchy queries (GiST + btree)
--   - Adjacency list traversal
--   - Full-text search (GIN)
--   - Trigram fuzzy search on code
--   - Filtered partial indexes for common query patterns
-- ==========================================================================

-- ltree hierarchy (GiST for @>, <@, ~; btree for sorting)
create index idx_schedule_items_path_gist on public.schedule_items using gist(path);
create index idx_schedule_items_path_btree on public.schedule_items using btree(path);

-- Adjacency list traversal
create index idx_schedule_items_parent on public.schedule_items(parent_item_id);

-- Version filtering
create index idx_schedule_items_version on public.schedule_items(schedule_source_version_id);

-- Full-text search
create index idx_schedule_items_search on public.schedule_items using gin(search_vector);

-- Active items only (most queries filter by active status)
create index idx_schedule_items_active
  on public.schedule_items(schedule_source_version_id)
  where status = 'active';

-- Root-level node lookup per version
create index idx_schedule_items_roots
  on public.schedule_items(schedule_source_version_id)
  where parent_item_id is null;

-- Ingestion batch tracing
create index idx_schedule_items_batch on public.schedule_items(ingestion_batch_id)
  where ingestion_batch_id is not null;

-- Rate lookup
create index idx_schedule_item_rates_item on public.schedule_item_rates(schedule_item_id);
create index idx_schedule_item_rates_item_order
  on public.schedule_item_rates(schedule_item_id, order_index);

-- Code prefix search (for tree search: "1.1" → finds "1.1", "1.1.1", "1.1.2")
create index idx_schedule_items_code on public.schedule_items(schedule_source_version_id, code text_pattern_ops);

-- Code trigram search (for fuzzy/partial code matching)
create index idx_schedule_items_code_trgm on public.schedule_items using gin(code gin_trgm_ops);

-- Annotation lookup
create index idx_schedule_item_annotations_item on public.schedule_item_annotations(schedule_item_id);

-- Attribute joins
create index idx_schedule_item_attributes_item on public.schedule_item_attributes(schedule_item_id);
