-- ==========================================================================
-- Migration: Foundation Auth Schemas
-- ==========================================================================
-- Creates the three-schema layout for the multi-tenant auth system:
--
--   public  — User-facing tables (tenants, profiles, tenant_members)
--   authz   — Authorization primitives (permissions, roles, assignments)
--   private — Security internals (sessions, risk scores, audit, alerts)
--
-- The `authenticated` role gets USAGE on `authz` (for RLS helper functions)
-- but NO table-level access. The `service_role` gets full access to both
-- `authz` and `private` schemas.
-- ==========================================================================

create extension if not exists pgcrypto;

create schema if not exists authz;
create schema if not exists private;

revoke all on schema authz from public;
revoke all on schema private from public;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text,
  slug text not null unique,
  logo_url text,
  logo_icon_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean not null default true,
  is_system_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  active_role_id uuid,
  display_name text,
  avatar_url text,
  permission_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists authz.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists authz.system_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists authz.system_role_permissions (
  system_role_id uuid not null references authz.system_roles (id) on delete cascade,
  permission_id uuid not null references authz.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (system_role_id, permission_id)
);

create table if not exists authz.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  system_role_key text references authz.system_roles (key),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists authz.role_permissions (
  role_id uuid not null references authz.roles (id) on delete cascade,
  permission_id uuid not null references authz.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists authz.tenant_member_roles (
  tenant_member_id uuid not null references public.tenant_members (id) on delete cascade,
  role_id uuid not null references authz.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_member_id, role_id)
);

alter table public.tenant_members
  add constraint tenant_members_active_role_id_fkey
  foreign key (active_role_id)
  references authz.roles (id)
  on delete set null;

create table if not exists private.auth_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  refresh_token_hash text not null,
  refresh_token_seq integer not null default 0,
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  is_revoked boolean not null default false,
  revoked_at timestamptz,
  revoke_reason text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists private.security_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  event_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists private.audit_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists private.user_risk_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  score integer not null default 0,
  is_locked boolean not null default false,
  locked_at timestamptz,
  lock_reason text,
  locked_until timestamptz,
  last_evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.security_alerts (
  id uuid primary key default gen_random_uuid(),
  security_event_id uuid not null,
  channel text not null check (channel in ('email', 'slack', 'dashboard')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'acknowledged')),
  recipient text,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Default partitions catch rows until monthly partitions are created
create table if not exists private.security_events_default
  partition of private.security_events default;

create table if not exists private.audit_logs_default
  partition of private.audit_logs default;

-- Initial monthly partitions (2026 Q2)
create table if not exists private.security_events_2026_04
  partition of private.security_events
  for values from ('2026-04-01') to ('2026-05-01');

create table if not exists private.security_events_2026_05
  partition of private.security_events
  for values from ('2026-05-01') to ('2026-06-01');

create table if not exists private.security_events_2026_06
  partition of private.security_events
  for values from ('2026-06-01') to ('2026-07-01');

create table if not exists private.audit_logs_2026_04
  partition of private.audit_logs
  for values from ('2026-04-01') to ('2026-05-01');

create table if not exists private.audit_logs_2026_05
  partition of private.audit_logs
  for values from ('2026-05-01') to ('2026-06-01');

create table if not exists private.audit_logs_2026_06
  partition of private.audit_logs
  for values from ('2026-06-01') to ('2026-07-01');

create index if not exists idx_tenant_members_user_id on public.tenant_members (user_id);
create index if not exists idx_tenant_members_tenant_status on public.tenant_members (tenant_id, status);
create index if not exists idx_roles_tenant_id on authz.roles (tenant_id);
create index if not exists idx_role_permissions_permission_id on authz.role_permissions (permission_id);
create index if not exists idx_tenant_member_roles_member on authz.tenant_member_roles (tenant_member_id);
create index if not exists idx_tenant_member_roles_role on authz.tenant_member_roles (role_id);
create index if not exists idx_auth_sessions_user on private.auth_sessions (user_id, is_revoked);
create index if not exists idx_auth_sessions_tenant on private.auth_sessions (tenant_id);
create index if not exists idx_security_events_user on private.security_events (user_id, created_at desc);
create index if not exists idx_security_events_tenant on private.security_events (tenant_id, created_at desc);
create index if not exists idx_audit_logs_tenant on private.audit_logs (tenant_id, created_at desc);
create index if not exists idx_audit_logs_resource on private.audit_logs (resource_type, resource_id);
create index if not exists idx_security_alerts_status on private.security_alerts (status, created_at desc);

grant usage on schema authz to authenticated;
grant usage on schema authz to service_role;
grant usage on schema private to service_role;

grant all on all tables in schema authz to service_role;
grant all on all sequences in schema authz to service_role;
grant all on all routines in schema authz to service_role;

grant all on all tables in schema private to service_role;
grant all on all sequences in schema private to service_role;
grant all on all routines in schema private to service_role;

alter default privileges in schema authz grant all on tables to service_role;
alter default privileges in schema authz grant all on sequences to service_role;
alter default privileges in schema authz grant all on routines to service_role;

alter default privileges in schema private grant all on tables to service_role;
alter default privileges in schema private grant all on sequences to service_role;
alter default privileges in schema private grant all on routines to service_role;
