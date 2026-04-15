-- Idempotent upgrade: environments created before label / order_index / rate_display
-- were added to schedule_item_rates in 20260408092600_schedule_tables.sql receive
-- the same columns (fresh installs already have them from CREATE TABLE).

alter table public.schedule_item_rates
  add column if not exists label text,
  add column if not exists order_index int,
  add column if not exists rate_display text;

create index if not exists idx_schedule_item_rates_item_order
  on public.schedule_item_rates(schedule_item_id, order_index);
