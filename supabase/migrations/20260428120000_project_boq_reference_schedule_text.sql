-- Denormalized reference schedule label (cross-version schedule item reference), distinct from item_code.
alter table public.project_boq_lines
  add column if not exists reference_schedule_text text not null default '';

comment on column public.project_boq_lines.reference_schedule_text is
  'Display snapshot for schedule reference annotations (e.g. source + code); not the same as item_code.';
