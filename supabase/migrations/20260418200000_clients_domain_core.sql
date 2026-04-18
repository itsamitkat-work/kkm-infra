-- ==========================================================================
-- Migration: Clients domain — core tables and triggers
-- ==========================================================================
-- Adds tenant-scoped `clients` and `client_schedules` mirroring the projects
-- domain (see 20260418100000_projects_domain_core.sql). Addresses and
-- contacts are stored as jsonb arrays on the parent `clients` row.
-- ==========================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  display_name text not null,
  full_name text,
  gstin text,
  addresses jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_status_check check (status in ('active', 'inactive')),
  constraint clients_addresses_is_array check (jsonb_typeof(addresses) = 'array'),
  constraint clients_contacts_is_array check (jsonb_typeof(contacts) = 'array'),
  constraint clients_gstin_format_check check (
    gstin is null
    or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$'
  )
);

create table public.client_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  schedule_source_id uuid not null references public.schedule_sources (id) on delete restrict,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, schedule_source_id)
);

create unique index client_schedules_one_default_per_client
  on public.client_schedules (client_id)
  where is_default;

create index clients_tenant_status_idx on public.clients (tenant_id, status);
create index clients_tenant_display_name_idx on public.clients (tenant_id, display_name);
create index clients_tenant_created_idx on public.clients (tenant_id, created_at desc);
create index clients_tenant_gstin_idx on public.clients (tenant_id, gstin) where gstin is not null;
create index clients_meta_gin_idx on public.clients using gin (meta);
create index clients_addresses_gin_idx on public.clients using gin (addresses);
create index clients_contacts_gin_idx on public.clients using gin (contacts);

create index client_schedules_client_id_idx on public.client_schedules (client_id);
create index client_schedules_schedule_source_id_idx on public.client_schedules (schedule_source_id);

create or replace function public.clients_set_tenant_before_insert()
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
    raise exception 'tenant context required to create a client';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;

create trigger clients_set_tenant_before_insert
before insert on public.clients
for each row execute function public.clients_set_tenant_before_insert();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.handle_updated_at();

create trigger client_schedules_set_updated_at
before update on public.client_schedules
for each row execute function public.handle_updated_at();

create or replace function public.client_schedules_clear_other_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.client_schedules
    set is_default = false, updated_at = now()
    where client_id = new.client_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

create trigger client_schedules_clear_other_defaults
before insert or update of is_default on public.client_schedules
for each row
when (new.is_default = true)
execute function public.client_schedules_clear_other_defaults();

drop trigger if exists audit_clients on public.clients;
create trigger audit_clients
after insert or update or delete on public.clients
for each row execute function private.capture_audit_log();

drop trigger if exists audit_client_schedules on public.client_schedules;
create trigger audit_client_schedules
after insert or update or delete on public.client_schedules
for each row execute function private.capture_audit_log();

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_schedules to authenticated;
