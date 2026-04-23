-- Project BOQ lines (Project items tab) + estimation / measurement / billing domain lines.
-- order_key uses floating-order semantics (append + midpoint); trigger seeds domain rows on BOQ insert.

-- ---------------------------------------------------------------------------
-- Enum: deviation report comparison (matches apps/web DeviationReportType)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_deviation_comparison'
  ) then
    create type public.project_deviation_comparison as enum (
      'GENvsEST',
      'GENvsMSR',
      'ESTvsMSR'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- project_boq_lines
-- ---------------------------------------------------------------------------
create table if not exists public.project_boq_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items (id),
  work_order_number text not null default '',
  order_key double precision not null default 1000,
  item_code text not null default '',
  item_description text not null default '',
  unit_display text not null default '',
  rate_amount numeric,
  contract_quantity numeric not null default 0,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_boq_lines_project_order_id_idx
  on public.project_boq_lines (project_id, order_key, id);

create index if not exists project_boq_lines_project_id_idx
  on public.project_boq_lines (project_id);

drop trigger if exists project_boq_lines_set_updated_at on public.project_boq_lines;

create trigger project_boq_lines_set_updated_at
  before update on public.project_boq_lines
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- project_boq_line_segments (M:N BOQ <-> project_segments)
-- ---------------------------------------------------------------------------
create table if not exists public.project_boq_line_segments (
  project_boq_line_id uuid not null references public.project_boq_lines (id) on delete cascade,
  project_segment_id uuid not null references public.project_segments (id) on delete cascade,
  primary key (project_boq_line_id, project_segment_id)
);

create index if not exists project_boq_line_segments_segment_idx
  on public.project_boq_line_segments (project_segment_id);

-- ---------------------------------------------------------------------------
-- Shared shape: estimation / measurement / billing line tables
-- Multiple rows per BOQ line are allowed (sheet-style sub-rows).
-- ---------------------------------------------------------------------------
create table if not exists public.project_estimation_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_boq_line_id uuid references public.project_boq_lines (id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items (id),
  project_segment_id uuid references public.project_segments (id) on delete set null,
  line_description text not null default '',
  length numeric not null default 0,
  width numeric not null default 0,
  height numeric not null default 0,
  no1 numeric not null default 0,
  no2 numeric not null default 0,
  quantity numeric not null default 0,
  is_checked boolean not null default false,
  is_verified boolean not null default false,
  order_key double precision not null default 1000,
  remark text,
  rate_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_estimation_lines_schedule_required check (schedule_item_id is not null)
);

create index if not exists project_estimation_lines_project_order_id_idx
  on public.project_estimation_lines (project_id, order_key, id);

create index if not exists project_estimation_lines_boq_idx
  on public.project_estimation_lines (project_boq_line_id);

create table if not exists public.project_measurement_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_boq_line_id uuid references public.project_boq_lines (id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items (id),
  project_segment_id uuid references public.project_segments (id) on delete set null,
  line_description text not null default '',
  length numeric not null default 0,
  width numeric not null default 0,
  height numeric not null default 0,
  no1 numeric not null default 0,
  no2 numeric not null default 0,
  quantity numeric not null default 0,
  is_checked boolean not null default false,
  is_verified boolean not null default false,
  order_key double precision not null default 1000,
  remark text,
  rate_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_measurement_lines_schedule_required check (schedule_item_id is not null)
);

create index if not exists project_measurement_lines_project_order_id_idx
  on public.project_measurement_lines (project_id, order_key, id);

create index if not exists project_measurement_lines_boq_idx
  on public.project_measurement_lines (project_boq_line_id);

create table if not exists public.project_billing_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_boq_line_id uuid references public.project_boq_lines (id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items (id),
  project_segment_id uuid references public.project_segments (id) on delete set null,
  line_description text not null default '',
  length numeric not null default 0,
  width numeric not null default 0,
  height numeric not null default 0,
  no1 numeric not null default 0,
  no2 numeric not null default 0,
  quantity numeric not null default 0,
  is_checked boolean not null default false,
  is_verified boolean not null default false,
  order_key double precision not null default 1000,
  remark text,
  rate_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_billing_lines_schedule_required check (schedule_item_id is not null)
);

create index if not exists project_billing_lines_project_order_id_idx
  on public.project_billing_lines (project_id, order_key, id);

create index if not exists project_billing_lines_boq_idx
  on public.project_billing_lines (project_boq_line_id);

drop trigger if exists project_estimation_lines_set_updated_at on public.project_estimation_lines;
create trigger project_estimation_lines_set_updated_at
  before update on public.project_estimation_lines
  for each row execute function public.handle_updated_at();

drop trigger if exists project_measurement_lines_set_updated_at on public.project_measurement_lines;
create trigger project_measurement_lines_set_updated_at
  before update on public.project_measurement_lines
  for each row execute function public.handle_updated_at();

drop trigger if exists project_billing_lines_set_updated_at on public.project_billing_lines;
create trigger project_billing_lines_set_updated_at
  before update on public.project_billing_lines
  for each row execute function public.handle_updated_at();

drop trigger if exists project_boq_line_segments_set_updated_at on public.project_boq_line_segments;

-- ---------------------------------------------------------------------------
-- After insert on BOQ: seed one row in each domain table (aligned order_key)
-- ---------------------------------------------------------------------------
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
    coalesce(new.item_description, ''),
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
    coalesce(new.item_description, ''),
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
    coalesce(new.item_description, ''),
    new.order_key,
    new.rate_amount
  );

  return new;
end;
$$;

alter function public.tg_project_boq_lines_after_insert_seed_domain_rows() owner to postgres;

drop trigger if exists project_boq_lines_after_insert_seed_domain_rows on public.project_boq_lines;

create trigger project_boq_lines_after_insert_seed_domain_rows
  after insert on public.project_boq_lines
  for each row
  execute function public.tg_project_boq_lines_after_insert_seed_domain_rows();

-- ---------------------------------------------------------------------------
-- RLS (match project_segments: project_policy_ok(project_id, action))
-- ---------------------------------------------------------------------------
alter table public.project_boq_lines enable row level security;
alter table public.project_boq_line_segments enable row level security;
alter table public.project_estimation_lines enable row level security;
alter table public.project_measurement_lines enable row level security;
alter table public.project_billing_lines enable row level security;

-- BOQ lines
create policy "project_boq_lines_select" on public.project_boq_lines
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_boq_lines.project_id, 'read'::text))
  );

create policy "project_boq_lines_insert" on public.project_boq_lines
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_boq_lines.project_id, 'update'::text))
  );

create policy "project_boq_lines_update" on public.project_boq_lines
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_boq_lines.project_id, 'update'::text))
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_boq_lines.project_id, 'update'::text))
  );

create policy "project_boq_lines_delete" on public.project_boq_lines
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_boq_lines.project_id, 'update'::text))
  );

-- Junction: join to BOQ for project_id
create policy "project_boq_line_segments_select" on public.project_boq_line_segments
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      select public.project_policy_ok(
        (select b.project_id from public.project_boq_lines b where b.id = project_boq_line_segments.project_boq_line_id),
        'read'::text
      )
    )
  );

create policy "project_boq_line_segments_insert" on public.project_boq_line_segments
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (
      select public.project_policy_ok(
        (select b.project_id from public.project_boq_lines b where b.id = project_boq_line_segments.project_boq_line_id),
        'update'::text
      )
    )
  );

create policy "project_boq_line_segments_update" on public.project_boq_line_segments
  for update to authenticated
  using (false);

create policy "project_boq_line_segments_delete" on public.project_boq_line_segments
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      select public.project_policy_ok(
        (select b.project_id from public.project_boq_lines b where b.id = project_boq_line_segments.project_boq_line_id),
        'update'::text
      )
    )
  );

-- Estimation lines
create policy "project_estimation_lines_select" on public.project_estimation_lines
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_estimation_lines.project_id, 'read'::text))
  );

create policy "project_estimation_lines_insert" on public.project_estimation_lines
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_estimation_lines.project_id, 'update'::text))
  );

create policy "project_estimation_lines_update" on public.project_estimation_lines
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_estimation_lines.project_id, 'update'::text))
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_estimation_lines.project_id, 'update'::text))
  );

create policy "project_estimation_lines_delete" on public.project_estimation_lines
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_estimation_lines.project_id, 'update'::text))
  );

-- Measurement lines
create policy "project_measurement_lines_select" on public.project_measurement_lines
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_measurement_lines.project_id, 'read'::text))
  );

create policy "project_measurement_lines_insert" on public.project_measurement_lines
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_measurement_lines.project_id, 'update'::text))
  );

create policy "project_measurement_lines_update" on public.project_measurement_lines
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_measurement_lines.project_id, 'update'::text))
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_measurement_lines.project_id, 'update'::text))
  );

create policy "project_measurement_lines_delete" on public.project_measurement_lines
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_measurement_lines.project_id, 'update'::text))
  );

-- Billing lines
create policy "project_billing_lines_select" on public.project_billing_lines
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_billing_lines.project_id, 'read'::text))
  );

create policy "project_billing_lines_insert" on public.project_billing_lines
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_billing_lines.project_id, 'update'::text))
  );

create policy "project_billing_lines_update" on public.project_billing_lines
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_billing_lines.project_id, 'update'::text))
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (select public.project_policy_ok(project_billing_lines.project_id, 'update'::text))
  );

create policy "project_billing_lines_delete" on public.project_billing_lines
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select public.project_policy_ok(project_billing_lines.project_id, 'update'::text))
  );

-- ---------------------------------------------------------------------------
-- RPC: deviation rows (security definer + auth gates)
-- ---------------------------------------------------------------------------
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
    b.item_description,
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

grant execute on function public.rpc_project_deviation_rows(uuid, public.project_deviation_comparison)
  to authenticated;

revoke execute on function public.rpc_project_deviation_rows(uuid, public.project_deviation_comparison)
  from anon;

-- ---------------------------------------------------------------------------
-- Grants on tables (mirror project_segments: broad grants; RLS enforces)
-- ---------------------------------------------------------------------------
grant all on table public.project_boq_lines to anon;
grant all on table public.project_boq_lines to authenticated;
grant all on table public.project_boq_lines to service_role;

grant all on table public.project_boq_line_segments to anon;
grant all on table public.project_boq_line_segments to authenticated;
grant all on table public.project_boq_line_segments to service_role;

grant all on table public.project_estimation_lines to anon;
grant all on table public.project_estimation_lines to authenticated;
grant all on table public.project_estimation_lines to service_role;

grant all on table public.project_measurement_lines to anon;
grant all on table public.project_measurement_lines to authenticated;
grant all on table public.project_measurement_lines to service_role;

grant all on table public.project_billing_lines to anon;
grant all on table public.project_billing_lines to authenticated;
grant all on table public.project_billing_lines to service_role;
