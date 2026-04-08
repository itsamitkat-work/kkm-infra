-- ==========================================================================
-- Migration: Seed Units
-- ==========================================================================
-- Seeds the units table with common CPWD schedule-of-rates measurement
-- units. Idempotent via ON CONFLICT.
-- ==========================================================================

insert into public.units (name, display_name, symbol, dimension, is_base, conversion_factor)
values
  ('square_meter',  'Square Metre',  'sqm',    'area',   true,  1),
  ('cubic_meter',   'Cubic Metre',   'cum',    'volume', true,  1),
  ('metre',         'Metre',         'metre',  'length', true,  1),
  ('kilogram',      'Kilogram',      'kg',     'mass',   true,  1),
  ('litre',         'Litre',         'litre',  'volume', false, 0.001),
  ('each',          'Each',          'each',   'count',  true,  1),
  ('lump_sum',      'Lump Sum',      'LS',     'count',  false, 1),
  ('running_metre', 'Running Metre', 'rm',     'length', false, 1),
  ('quintal',       'Quintal',       'qtl',    'mass',   false, 100),
  ('tonne',         'Tonne',         'tonne',  'mass',   false, 1000)
on conflict (symbol) do nothing;
