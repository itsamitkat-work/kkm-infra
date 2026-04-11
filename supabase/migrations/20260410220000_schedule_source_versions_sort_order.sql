alter table public.schedule_source_versions
  add column if not exists sort_order double precision;

comment on column public.schedule_source_versions.sort_order is
  'Floating-point display order (lower first). Use fractions (e.g. 1.5 between 1 and 2) to insert without renumbering. Seeded from manifest source order when present.';
