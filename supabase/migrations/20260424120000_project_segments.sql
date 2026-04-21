-- Many segments per project; browser access via Supabase + RLS (replaces legacy REST).

create table if not exists public.project_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  segment_name text not null,
  segment_type text not null default 'Phase',
  description text,
  start_date date,
  end_date date,
  status text not null default 'Draft',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_segments_status_check check (
    status = any (
      array['Draft', 'Active', 'Completed', 'Archived']::text[]
    )
  )
);

create index if not exists project_segments_project_id_display_order_idx
  on public.project_segments (project_id, display_order);

create index if not exists project_segments_project_id_segment_name_idx
  on public.project_segments (project_id, segment_name);

drop trigger if exists project_segments_set_updated_at on public.project_segments;

create trigger project_segments_set_updated_at
  before update on public.project_segments
  for each row execute function public.handle_updated_at();

alter table public.project_segments enable row level security;

create policy "project_segments_select" on public.project_segments
  for select to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      select public.project_policy_ok(
        project_segments.project_id,
        'read'::text
      )
    )
  );

create policy "project_segments_insert" on public.project_segments
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (
      select public.project_policy_ok(
        project_segments.project_id,
        'update'::text
      )
    )
  );

create policy "project_segments_update" on public.project_segments
  for update to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      select public.project_policy_ok(
        project_segments.project_id,
        'update'::text
      )
    )
  )
  with check (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (select authz.check_permission_version())
    and (
      select public.project_policy_ok(
        project_segments.project_id,
        'update'::text
      )
    )
  );

create policy "project_segments_delete" on public.project_segments
  for delete to authenticated
  using (
    (select authz.is_session_valid())
    and (not (select authz.is_account_locked()))
    and (
      select public.project_policy_ok(
        project_segments.project_id,
        'update'::text
      )
    )
  );

grant all on table public.project_segments to anon;
grant all on table public.project_segments to authenticated;
grant all on table public.project_segments to service_role;
