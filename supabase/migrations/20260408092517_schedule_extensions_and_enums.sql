-- ==========================================================================
-- Migration: Schedule of Rates — Extensions & ENUMs
-- ==========================================================================
-- Enables ltree (hierarchical paths) and pg_trgm (trigram fuzzy search),
-- then creates the enum types used by schedule tables.
-- ==========================================================================

create extension if not exists ltree;
create extension if not exists pg_trgm;

create type public.record_status as enum (
  'active',
  'inactive',
  'deprecated'
);

create type public.schedule_node_type as enum (
  'section',
  'group',
  'item'
);

create type public.schedule_source_type as enum (
  'govt',
  'private'
);

create type public.schedule_annotation_type as enum (
  'note',
  'remark',
  'condition',
  'reference'
);
