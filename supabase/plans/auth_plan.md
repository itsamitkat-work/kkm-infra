:::writing{variant=“standard” id=“73952”}

🛡️ Supabase Production-Grade Auth & Authorization System

🎯 Goal

Build a secure, scalable, multi-tenant authentication and authorization system with:
• Tenant isolation (strict)
• Permission-based authorization (no role checks at runtime)
• JWT-based performance (no joins in RLS)
• Session management + revocation
• Abuse detection & rate limiting
• Clean schema separation

⸻

🧱 1. Architecture Overview

Client (Web / Mobile)
↓
API Layer (Edge Functions / Backend)

- Rate limiting (IP/user/tenant)
- JWT validation
- Session validation
- Security checks
- Permission pre-check
  ↓
  Supabase Auth (JWT issuer + hook)
  ↓
  Postgres (RLS enforced)
  ↓
  Security Engine (events + scoring + actions)

⸻

🗂️ 2. Schema Structure

Schema Purpose
auth Supabase managed (users)
public tenant + app data
authz authorization logic
private sensitive data (sessions, logs)

⸻

🏢 3. Database Design

3.1 public schema (Application Data)

tenants

create table public.tenants (
id uuid primary key default gen_random_uuid(),
name text not null,
slug text unique not null,
created_at timestamptz default now()
);

⸻

profiles (global public user profile)

create table public.profiles (
id uuid primary key references auth.users(id),

username text unique,
display_name text,
avatar_url text,
bio text,

is_public boolean default true,

created_at timestamptz default now()
);

⸻

tenant_members

create table public.tenant_members (
id uuid primary key default gen_random_uuid(),

tenant_id uuid references public.tenants(id),
user_id uuid references auth.users(id),

status text check (status in ('active','invited','suspended')),

display_name text,
avatar_url text,

permission_version int default 1,

created_at timestamptz default now(),

unique (tenant_id, user_id)
);

⸻

example business table (items)

create table public.items (
id uuid primary key default gen_random_uuid(),

tenant_id uuid not null references public.tenants(id),
name text,

created_at timestamptz default now()
);

⸻

🔐 3.2 authz schema (Authorization)

permissions (global)

create table authz.permissions (
id uuid primary key default gen_random_uuid(),
key text unique not null,
description text
);

⸻

system_roles (templates)

create table authz.system_roles (
id uuid primary key default gen_random_uuid(),
key text unique not null, -- system_admin, tenant_admin, project_engineer
name text
);

⸻

system_role_permissions

create table authz.system_role_permissions (
system_role_id uuid references authz.system_roles(id),
permission_id uuid references authz.permissions(id),

primary key (system_role_id, permission_id)
);

⸻

tenant roles

create table authz.roles (
id uuid primary key default gen_random_uuid(),

tenant_id uuid references public.tenants(id),

name text,
slug text,

system_role_key text, -- template reference
is_system boolean default false
);

⸻

role_permissions

create table authz.role_permissions (
role_id uuid references authz.roles(id),
permission_id uuid references authz.permissions(id),

primary key (role_id, permission_id)
);

⸻

tenant_member_roles

create table authz.tenant_member_roles (
tenant_member_id uuid references public.tenant_members(id),
role_id uuid references authz.roles(id),

primary key (tenant_member_id, role_id)
);

⸻

🔒 3.3 private schema (Sensitive)

sessions

create table private.auth_sessions (
id uuid primary key default gen_random_uuid(),

user_id uuid references auth.users(id),
tenant_id uuid,

refresh_token_hash text not null,

ip_address inet,
user_agent text,

is_revoked boolean default false,

created_at timestamptz default now(),
expires_at timestamptz
);

⸻

security_events

create table private.security_events (
id uuid primary key default gen_random_uuid(),

user_id uuid,
tenant_id uuid,

event_type text,
severity text,

ip_address inet,
metadata jsonb,

created_at timestamptz default now()
);

⸻

audit_logs

create table private.audit_logs (
id uuid primary key default gen_random_uuid(),

user_id uuid,
tenant_id uuid,

action text,
resource_type text,
resource_id uuid,

old_data jsonb,
new_data jsonb,

created_at timestamptz default now()
);

⸻

⚡ 4. JWT Design (Supabase Hook)

{
"sub": "user_id",
"tid": "tenant_id",
"sid": "session_id",
"perms": ["items.read"],
"pv": 1,
"is_system_admin": false
}

⸻

🧠 5. Helper Functions (authz)

create function authz.current_tenant_id()
returns uuid
language sql stable security definer
as $$
select (auth.jwt() ->> 'tid')::uuid;

$$
;


⸻


create function authz.jwt_permissions()
returns jsonb
language sql stable security definer
as
$$

select coalesce(auth.jwt() -> 'perms', '[]'::jsonb);

$$
;


⸻


create function authz.has_permission(p text)
returns boolean
language sql stable security definer
as
$$

select authz.jwt_permissions() ? p;

$$
;


⸻


create function authz.is_system_admin()
returns boolean
language sql stable security definer
as
$$

select coalesce((auth.jwt() ->> 'is_system_admin')::boolean, false);

$$
;


⸻

🛡️ 6. RLS Policy Pattern

Enable RLS

alter table public.items enable row level security;


⸻

Policy

create policy "items_access"
on public.items
for all
to authenticated
using (
  authz.is_system_admin()
  OR (
    tenant_id = authz.current_tenant_id()
    AND authz.has_permission('items.read')
  )
)
with check (
  authz.is_system_admin()
  OR (
    tenant_id = authz.current_tenant_id()
    AND authz.has_permission('items.write')
  )
);


⸻

🔐 7. API Middleware Flow

1. Rate limit (IP)
2. Validate JWT
3. Validate session (sid)
4. Check security flags
5. Resolve tenant
6. Check permission
7. Query DB (RLS enforced)


⸻

🚨 8. Abuse Protection

Risk Scoring

failed_login → +2
rate_limit_hit → +3
permission_denied → +2
new_ip → +5


⸻

Actions
	•	Block user
	•	Revoke sessions
	•	Require re-auth

⸻

🔄 9. Tenant Role Seeding

On tenant creation:

Create roles:
  - tenant_admin
  - project_engineer


⸻

🔑 10. Role Definitions

system_admin
	•	NOT a normal role
	•	Stored as JWT flag (is_system_admin)
	•	Can bypass RLS (carefully controlled)

⸻

tenant_admin
	•	Full access within tenant
	•	All permissions

⸻

project_engineer
	•	Scoped access:

projects.read
projects.write
items.read
items.write
members.read


⸻

🧪 11. Testing Checklist
	•	Cross-tenant access blocked
	•	System admin works correctly
	•	Tenant isolation enforced
	•	Revoked session blocked
	•	Permission checks correct
	•	RLS cannot be bypassed

⸻

🚀 12. Core Principles
	•	Permissions are the ONLY enforcement layer
	•	Roles are just grouping
	•	JWT is for performance
	•	Database is source of truth
	•	RLS is final security boundary
	•	System admin is NOT a tenant role

⸻

🔥 Golden Rule

Data → public
Decisions → authz
Secrets → private




$$
