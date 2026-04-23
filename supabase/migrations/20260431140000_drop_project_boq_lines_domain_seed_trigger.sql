-- Domain breakdown rows (`project_*_lines`) are created only when the user adds
-- them in the UI — not on `project_boq_lines` insert.

drop trigger if exists project_boq_lines_after_insert_seed_domain_rows
  on public.project_boq_lines;

drop function if exists public.tg_project_boq_lines_after_insert_seed_domain_rows();
