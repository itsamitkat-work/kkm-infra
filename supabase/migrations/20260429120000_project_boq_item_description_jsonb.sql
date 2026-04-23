-- Structured BOQ item name (root → leaf) as jsonb; domain tables keep plain text via helper.

create or replace function public.project_boq_item_description_plain(p jsonb)
returns text
language sql
immutable
as $$
  select case
    when p is null then ''
    when jsonb_typeof(p) <> 'object' then ''
    when coalesce((p->>'v')::int, -1) = 1 then coalesce(
      (
        select string_agg(
                 coalesce(
                   nullif(trim(t.elem->>'label'), ''),
                   nullif(trim(t.elem->>'id'), '')
                 ),
                 ' › '
                 order by t.ord
               )
        from jsonb_array_elements(coalesce(p->'segments', '[]'::jsonb))
          with ordinality as t(elem, ord)
      ),
      ''
    )
    else ''
  end;
$$;

alter function public.project_boq_item_description_plain(jsonb) owner to postgres;

grant execute on function public.project_boq_item_description_plain(jsonb) to authenticated;
grant execute on function public.project_boq_item_description_plain(jsonb) to service_role;

alter table public.project_boq_lines
  alter column item_description drop default;

alter table public.project_boq_lines
  alter column item_description type jsonb
  using (
    case
      when coalesce(btrim(item_description::text), '') = '' then
        '{"v":1,"leafScheduleItemId":"","segments":[]}'::jsonb
      else jsonb_build_object(
        'v', 1,
        'leafScheduleItemId', '',
        'segments', jsonb_build_array(
          jsonb_build_object('id', '', 'label', item_description::text)
        )
      )
    end
  );

alter table public.project_boq_lines
  alter column item_description set default '{"v":1,"leafScheduleItemId":"","segments":[]}'::jsonb;

alter table public.project_boq_lines
  alter column item_description set not null;

create or replace function public.tg_project_boq_lines_after_insert_seed_domain_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

  return new;
end;
$$;

alter function public.tg_project_boq_lines_after_insert_seed_domain_rows() owner to postgres;

create or replace function public.rpc_project_deviation_rows(
  p_project_id uuid,
  p_comparison public.project_deviation_comparison
)
returns table (
  work_order_number text,
  item_description text,
  rate_amount numeric,
  quantity_reference numeric,
  quantity_compare numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (select authz.is_session_valid()) then
    return;
  end if;
  if (select authz.is_account_locked()) then
    return;
  end if;
  if not (select public.project_policy_ok(p_project_id, 'read'::text)) then
    return;
  end if;

  return query
  select
    b.work_order_number,
    public.project_boq_item_description_plain(b.item_description),
    b.rate_amount,
    case p_comparison
      when 'GENvsEST'::public.project_deviation_comparison then b.contract_quantity
      when 'GENvsMSR'::public.project_deviation_comparison then b.contract_quantity
      when 'ESTvsMSR'::public.project_deviation_comparison then coalesce(e.quantity, 0)
    end as quantity_reference,
    case p_comparison
      when 'GENvsEST'::public.project_deviation_comparison then coalesce(e.quantity, 0)
      when 'GENvsMSR'::public.project_deviation_comparison then coalesce(m.quantity, 0)
      when 'ESTvsMSR'::public.project_deviation_comparison then coalesce(m.quantity, 0)
    end as quantity_compare
  from public.project_boq_lines b
  left join lateral (
    select sum(el.quantity)::numeric as quantity
    from public.project_estimation_lines el
    where el.project_boq_line_id = b.id
  ) e on true
  left join lateral (
    select sum(ml.quantity)::numeric as quantity
    from public.project_measurement_lines ml
    where ml.project_boq_line_id = b.id
  ) m on true
  where b.project_id = p_project_id
  order by b.order_key asc, b.id asc;
end;
$$;

alter function public.rpc_project_deviation_rows(uuid, public.project_deviation_comparison) owner to postgres;
