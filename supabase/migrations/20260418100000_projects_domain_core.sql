-- ==========================================================================
-- Migration: Projects domain — core tables and triggers
-- ==========================================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'active',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_status_check check (status in ('active', 'on_hold', 'closed'))
);

create table public.project_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  schedule_source_id uuid not null references public.schedule_sources (id) on delete restrict,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, schedule_source_id)
);

create unique index project_schedules_one_default_per_project
  on public.project_schedules (project_id)
  where is_default;

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references authz.roles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (project_id, user_id, role_id)
);

create index projects_tenant_status_idx on public.projects (tenant_id, status);
create index projects_tenant_name_idx on public.projects (tenant_id, name);
create index projects_tenant_created_idx on public.projects (tenant_id, created_at desc);
create index projects_meta_gin_idx on public.projects using gin (meta);

create index project_schedules_project_id_idx on public.project_schedules (project_id);
create index project_schedules_schedule_source_id_idx on public.project_schedules (schedule_source_id);

create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_user_id_idx on public.project_members (user_id);
create index project_members_role_id_idx on public.project_members (role_id);

create or replace function public.projects_set_tenant_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, authz
as $$
declare
  v_tid uuid;
begin
  v_tid := (select authz.current_tenant_id());
  if v_tid is null then
    raise exception 'tenant context required to create a project';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;

create trigger projects_set_tenant_before_insert
before insert on public.projects
for each row execute function public.projects_set_tenant_before_insert();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.handle_updated_at();

create trigger project_schedules_set_updated_at
before update on public.project_schedules
for each row execute function public.handle_updated_at();

create or replace function public.project_members_enforce_role_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, authz
as $$
begin
  if not exists (
    select 1
    from public.projects p
    join authz.roles r on r.id = new.role_id
    where p.id = new.project_id
      and r.tenant_id = p.tenant_id
  ) then
    raise exception 'role_id must belong to the same tenant as the project';
  end if;
  return new;
end;
$$;

create trigger project_members_enforce_role_tenant
before insert or update on public.project_members
for each row execute function public.project_members_enforce_role_tenant();

create or replace function public.project_schedules_clear_other_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.project_schedules
    set is_default = false, updated_at = now()
    where project_id = new.project_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

create trigger project_schedules_clear_other_defaults
before insert or update of is_default on public.project_schedules
for each row
when (new.is_default = true)
execute function public.project_schedules_clear_other_defaults();

grant select on authz.roles to authenticated;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_schedules to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
