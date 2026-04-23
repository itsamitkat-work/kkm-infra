-- Supplementary BOQ rows (estimation / measurement / billing) must not seed
-- sibling domain tables — only `planned` rows seed all three.

create or replace function public.tg_project_boq_lines_after_insert_seed_domain_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_boq_lines_type = 'planned' then
    insert into public.project_estimation_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key
    );

    insert into public.project_measurement_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key
    );

    insert into public.project_billing_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key,
      rate_amount
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key,
      new.rate_amount
    );
  elsif new.project_boq_lines_type = 'estimation' then
    insert into public.project_estimation_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key
    );
  elsif new.project_boq_lines_type = 'measurement' then
    insert into public.project_measurement_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key
    );
  elsif new.project_boq_lines_type = 'billing' then
    insert into public.project_billing_lines (
      project_id,
      project_boq_line_id,
      schedule_item_id,
      line_description,
      order_key,
      rate_amount
    ) values (
      new.project_id,
      new.id,
      new.schedule_item_id,
      public.project_boq_item_description_plain(new.item_description),
      new.order_key,
      new.rate_amount
    );
  end if;

  return new;
end;
$$;

alter function public.tg_project_boq_lines_after_insert_seed_domain_rows() owner to postgres;

-- Remove domain rows incorrectly created for supplementary BOQ lines (before this fix).
delete from public.project_measurement_lines ml
using public.project_boq_lines b
where ml.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'estimation';

delete from public.project_billing_lines bl
using public.project_boq_lines b
where bl.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'estimation';

delete from public.project_estimation_lines el
using public.project_boq_lines b
where el.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'measurement';

delete from public.project_billing_lines bl
using public.project_boq_lines b
where bl.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'measurement';

delete from public.project_estimation_lines el
using public.project_boq_lines b
where el.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'billing';

delete from public.project_measurement_lines ml
using public.project_boq_lines b
where ml.project_boq_line_id = b.id
  and b.project_boq_lines_type = 'billing';
