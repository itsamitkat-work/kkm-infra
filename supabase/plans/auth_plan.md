# Supabase Production-Grade Auth & Authorization System

## Goal

Build a secure, scalable, multi-tenant authentication and authorization system with:

- Tenant isolation (strict)
- Permission-based authorization (no role checks at runtime)
- JWT-based performance (no joins in RLS)
- Session management + revocation + refresh token reuse detection
- Abuse detection, rate limiting & account lockout
- Clean schema separation with enforced access control (GRANT/REVOKE)
- Audit trail with automatic capture
- RLS testing automation (pgTAP)
- Security alerting system (Slack, Email, Dashboard)

---

## 1. Architecture Overview

```
Client (Web)
       ↓
API Layer (Edge Functions / Backend)
  ├─ Rate limiting (sliding window via Redis/Upstash)
  ├─ JWT validation
  ├─ Session validation (sid + revocation check)
  ├─ Permission version check (pv staleness)
  ├─ Security flags (lockout, risk score)
  └─ Permission pre-check
       ↓
Supabase Auth (JWT issuer + custom access token hook)
       ↓
Postgres (RLS enforced — session + permission validated)
       ↓
Security Engine (events + scoring + auto-actions)
```

---

## 2. Schema Structure

| Schema    | Purpose                            | Access                     |
| --------- | ---------------------------------- | -------------------------- |
| `auth`    | Supabase managed (users, sessions) | Supabase internal only     |
| `public`  | Tenant + app data                  | Authenticated via RLS      |
| `authz`   | Authorization logic                | Functions only (no direct) |
| `private` | Sensitive data (sessions, logs)    | Service role only          |

### Schema Access Control

> Supabase locks custom schemas by default — `anon` and `authenticated` have no access to
> `authz` or `private` out of the box. No REVOKE needed. Only explicit GRANTs below are required.

```sql
-- authz: let authenticated users call security definer helper functions
grant usage on schema authz to authenticated;

-- private: let Edge Functions (service_role) read/write sessions, logs, risk scores
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

-- authz: let service_role manage roles and permissions via Edge Functions
grant usage on schema authz to service_role;
grant all on all tables in schema authz to service_role;
```

---

## 3. Database Design

### 3.1 public schema (Application Data)

#### tenants

```sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text,
  slug text unique not null,
  logo_url text,
  logo_icon_url text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

#### profiles (global public user profile)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  username text unique,
  display_name text,
  avatar_url text,
  bio text,

  is_public boolean default true,
  is_system_admin boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

> `is_system_admin` is the **source of truth** for system admin status. The JWT hook reads this column to set the `is_system_admin` claim.

---

#### tenant_members

```sql
create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'active'
    check (status in ('active', 'suspended')),

  active_role_id uuid,

  display_name text,
  avatar_url text,

  permission_version int default 1,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (tenant_id, user_id)
);

-- FK added after authz.roles is created (cross-schema dependency)
-- alter table public.tenant_members
--   add constraint fk_active_role
--   foreign key (active_role_id) references authz.roles(id) on delete set null;
```

> **Role persistence:** `active_role_id` is stored in the DB, not the session. It survives logout. On next login the hook reads this value and issues the JWT with the same role — the user does not need to re-select. If a user has only one role assigned, that role is automatically used (the hook falls back to the single assigned role when `active_role_id` is null).

---

#### example business table (items)

```sql
create table public.items (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text,
  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

### 3.2 authz schema (Authorization)

#### permissions (global)

```sql
create table authz.permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  created_at timestamptz default now()
);
```

---

#### system_roles (templates)

```sql
create table authz.system_roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);
```

---

#### system_role_permissions

```sql
create table authz.system_role_permissions (
  system_role_id uuid not null references authz.system_roles(id) on delete cascade,
  permission_id uuid not null references authz.permissions(id) on delete cascade,

  primary key (system_role_id, permission_id)
);
```

---

#### tenant roles

```sql
create table authz.roles (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete cascade,

  name text not null,
  slug text not null,

  system_role_key text references authz.system_roles(key),
  is_system boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (tenant_id, slug)
);
```

---

#### role_permissions

```sql
create table authz.role_permissions (
  role_id uuid not null references authz.roles(id) on delete cascade,
  permission_id uuid not null references authz.permissions(id) on delete cascade,

  primary key (role_id, permission_id)
);
```

---

#### tenant_member_roles

```sql
create table authz.tenant_member_roles (
  tenant_member_id uuid not null references public.tenant_members(id) on delete cascade,
  role_id uuid not null references authz.roles(id) on delete cascade,

  primary key (tenant_member_id, role_id)
);
```

---

### 3.3 private schema (Sensitive)

#### sessions (supplementary to Supabase Auth sessions)

> Supabase Auth manages its own sessions internally. This table adds **application-level session metadata** (IP tracking, tenant binding, explicit revocation) on top of Supabase sessions. The `id` here corresponds to the Supabase session ID. The JWT hook verifies against this table.

```sql
create table private.auth_sessions (
  id uuid primary key,

  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,

  refresh_token_hash text not null,

  ip_address inet,
  user_agent text,
  device_fingerprint text,

  is_revoked boolean default false,
  revoked_at timestamptz,
  revoke_reason text,

  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  expires_at timestamptz not null
);
```

---

#### security_events

```sql
create table private.security_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,

  event_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),

  ip_address inet,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now()
) partition by range (created_at);

-- Create monthly partitions (run via cron or migration)
-- create table private.security_events_2026_01 partition of private.security_events
--   for values from ('2026-01-01') to ('2026-02-01');
```

---

#### audit_logs

```sql
create table private.audit_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,

  action text not null,
  resource_type text not null,
  resource_id uuid,

  old_data jsonb,
  new_data jsonb,

  ip_address inet,

  created_at timestamptz default now()
) partition by range (created_at);
```

---

#### user_risk_scores (account lockout tracking)

```sql
create table private.user_risk_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,

  score int default 0,
  is_locked boolean default false,
  locked_at timestamptz,
  lock_reason text,
  locked_until timestamptz,

  last_evaluated_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

### 3.4 Indexes

```sql
-- public
create index idx_items_tenant_id on public.items(tenant_id);
create index idx_tenant_members_user_id on public.tenant_members(user_id);
-- authz
create index idx_roles_tenant_id on authz.roles(tenant_id);
create index idx_tenant_member_roles_member on authz.tenant_member_roles(tenant_member_id);
create index idx_tenant_member_roles_role on authz.tenant_member_roles(role_id);

-- private
create index idx_auth_sessions_user on private.auth_sessions(user_id, is_revoked);
create index idx_auth_sessions_tenant on private.auth_sessions(tenant_id);
create index idx_security_events_user on private.security_events(user_id, created_at);
create index idx_security_events_tenant on private.security_events(tenant_id, created_at);
create index idx_audit_logs_tenant on private.audit_logs(tenant_id, created_at);
create index idx_audit_logs_resource on private.audit_logs(resource_type, resource_id);
```

---

### 3.5 updated_at Triggers

```sql
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables with updated_at
create trigger set_updated_at before update on public.tenants
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.tenant_members
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.items
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on authz.roles
  for each row execute function public.handle_updated_at();
```

---

### 3.6 Audit Log Trigger (automatic capture)

```sql
create or replace function private.capture_audit_log()
returns trigger
language plpgsql security definer
as $$
begin
  insert into private.audit_logs (
    user_id, tenant_id, action, resource_type, resource_id, old_data, new_data
  ) values (
    coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid,
      null
    ),
    coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'tid')::uuid,
      null
    ),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- Audit only high-risk auth/authz/user tables (NOT business tables like items)

create trigger audit_tenants after insert or update or delete on public.tenants
  for each row execute function private.capture_audit_log();

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function private.capture_audit_log();

create trigger audit_tenant_members after insert or update or delete on public.tenant_members
  for each row execute function private.capture_audit_log();

create trigger audit_roles after insert or update or delete on authz.roles
  for each row execute function private.capture_audit_log();

create trigger audit_role_permissions after insert or update or delete on authz.role_permissions
  for each row execute function private.capture_audit_log();

create trigger audit_tenant_member_roles after insert or update or delete on authz.tenant_member_roles
  for each row execute function private.capture_audit_log();
```

---

## 4. JWT Design (Supabase Custom Access Token Hook)

### JWT Claims

```json
{
  "sub": "user_id",
  "tid": "tenant_id",
  "sid": "session_id",
  "role": "project_engineer",
  "roles": ["project_engineer", "project_checker", "project_verifier"],
  "perms": ["items.read", "items.manage", "projects.read"],
  "pv": 1,
  "is_system_admin": false
}
```

> - `role` — the currently active role slug. `perms` contains only this role's permissions.
> - `roles` — all role slugs assigned to the user in this tenant. The frontend uses this to render a role switcher. The user can switch to any role in this list without logging out.

### Hook Implementation (SQL function)

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_id uuid;
  session_id uuid;
  member record;
  user_permissions text[];
  all_role_slugs text[];
  active_role_slug text;
  is_admin boolean;
  is_locked boolean;
begin
  user_id := (event ->> 'user_id')::uuid;
  session_id := (event -> 'claims' ->> 'session_id')::uuid;
  claims := event -> 'claims';

  -- Check if account is locked
  select urs.is_locked into is_locked
  from private.user_risk_scores urs
  where urs.user_id = custom_access_token_hook.user_id;

  if coalesce(is_locked, false) then
    -- Return claims without permissions; middleware will block
    claims := jsonb_set(claims, '{perms}', '[]'::jsonb);
    claims := jsonb_set(claims, '{is_locked}', 'true'::jsonb);
    return jsonb_set(event, '{claims}', claims);
  end if;

  -- Check session revocation
  if session_id is not null then
    perform 1 from private.auth_sessions s
    where s.id = session_id and s.is_revoked = true;
    if found then
      claims := jsonb_set(claims, '{perms}', '[]'::jsonb);
      claims := jsonb_set(claims, '{session_revoked}', 'true'::jsonb);
      return jsonb_set(event, '{claims}', claims);
    end if;
  end if;

  -- Check system admin
  select p.is_system_admin into is_admin
  from public.profiles p
  where p.id = custom_access_token_hook.user_id;

  claims := jsonb_set(claims, '{is_system_admin}', to_jsonb(coalesce(is_admin, false)));

  -- Get active tenant membership (use the session's tenant, or first active membership)
  select tm.id, tm.tenant_id, tm.permission_version, tm.active_role_id
  into member
  from public.tenant_members tm
  left join private.auth_sessions s on s.id = session_id
  where tm.user_id = custom_access_token_hook.user_id
    and tm.status = 'active'
  order by
    case when tm.tenant_id = s.tenant_id then 0 else 1 end,
    tm.created_at asc
  limit 1;

  if member is null then
    claims := jsonb_set(claims, '{tid}', 'null'::jsonb);
    claims := jsonb_set(claims, '{role}', 'null'::jsonb);
    claims := jsonb_set(claims, '{roles}', '[]'::jsonb);
    claims := jsonb_set(claims, '{perms}', '[]'::jsonb);
    claims := jsonb_set(claims, '{pv}', '0'::jsonb);
    return jsonb_set(event, '{claims}', claims);
  end if;

  -- Collect ALL assigned role slugs (for the frontend role switcher)
  select array_agg(r.slug order by r.name)
  into all_role_slugs
  from authz.tenant_member_roles tmr
  join authz.roles r on r.id = tmr.role_id
  where tmr.tenant_member_id = member.id;

  -- Fallback: if active_role_id is null and user has exactly one role, use it
  if member.active_role_id is null and array_length(all_role_slugs, 1) = 1 then
    select tmr.role_id into member.active_role_id
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = member.id
    limit 1;

    update public.tenant_members
    set active_role_id = member.active_role_id
    where id = member.id;
  end if;

  -- Resolve permissions from the ACTIVE role only (not all assigned roles)
  if member.active_role_id is not null then
    select r.slug into active_role_slug
    from authz.roles r
    where r.id = member.active_role_id;

    select array_agg(distinct ap.key) into user_permissions
    from authz.role_permissions rp
    join authz.permissions ap on ap.id = rp.permission_id
    where rp.role_id = member.active_role_id;
  end if;

  claims := jsonb_set(claims, '{tid}', to_jsonb(member.tenant_id));
  claims := jsonb_set(claims, '{sid}', to_jsonb(session_id));
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(active_role_slug, '')));
  claims := jsonb_set(claims, '{roles}', to_jsonb(coalesce(all_role_slugs, '{}'::text[])));
  claims := jsonb_set(claims, '{perms}', to_jsonb(coalesce(user_permissions, '{}'::text[])));
  claims := jsonb_set(claims, '{pv}', to_jsonb(member.permission_version));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant hook access to supabase_auth_admin
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant usage on schema public to supabase_auth_admin;
grant usage on schema authz to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;

grant select on public.profiles to supabase_auth_admin;
grant select on public.tenant_members to supabase_auth_admin;
grant select on authz.tenant_member_roles to supabase_auth_admin;
grant select on authz.role_permissions to supabase_auth_admin;
grant select on authz.permissions to supabase_auth_admin;
grant select on private.auth_sessions to supabase_auth_admin;
grant select on private.user_risk_scores to supabase_auth_admin;
```

---

## 5. Helper Functions (authz)

```sql
create or replace function authz.current_tenant_id()
returns uuid
language sql stable security definer
as $$
  select (auth.jwt() ->> 'tid')::uuid;
$$;

create or replace function authz.current_session_id()
returns uuid
language sql stable security definer
as $$
  select (auth.jwt() ->> 'sid')::uuid;
$$;

create or replace function authz.jwt_permissions()
returns jsonb
language sql stable security definer
as $$
  select coalesce(auth.jwt() -> 'perms', '[]'::jsonb);
$$;

create or replace function authz.has_permission(p text)
returns boolean
language sql stable security definer
as $$
  select authz.jwt_permissions() ? p;
$$;

create or replace function authz.is_system_admin()
returns boolean
language sql stable security definer
as $$
  select coalesce((auth.jwt() ->> 'is_system_admin')::boolean, false);
$$;

create or replace function authz.is_session_valid()
returns boolean
language sql stable security definer
as $$
  select coalesce(
    (auth.jwt() ->> 'session_revoked')::boolean, false
  ) = false;
$$;

create or replace function authz.is_account_locked()
returns boolean
language sql stable security definer
as $$
  select coalesce(
    (auth.jwt() ->> 'is_locked')::boolean, false
  );
$$;

create or replace function authz.check_permission_version()
returns boolean
language plpgsql stable security definer
as $$
declare
  jwt_pv int;
  db_pv int;
begin
  jwt_pv := coalesce((auth.jwt() ->> 'pv')::int, 0);

  select tm.permission_version into db_pv
  from public.tenant_members tm
  where tm.user_id = auth.uid()
    and tm.tenant_id = authz.current_tenant_id()
    and tm.status = 'active';

  return jwt_pv >= coalesce(db_pv, 0);
end;
$$;
```

---

## 6. RLS Policy Pattern

### Enable RLS

```sql
alter table public.items enable row level security;
```

### Policies (per-operation granularity)

```sql
-- SELECT
create policy "items_select"
on public.items
for select
to authenticated
using (
  authz.is_session_valid()
  and not authz.is_account_locked()
  and (
    authz.is_system_admin()
    or (
      tenant_id = authz.current_tenant_id()
      and authz.has_permission('items.read')
      and authz.check_permission_version()
    )
  )
);

-- INSERT
create policy "items_insert"
on public.items
for insert
to authenticated
with check (
  authz.is_session_valid()
  and not authz.is_account_locked()
  and (
    authz.is_system_admin()
    or (
      tenant_id = authz.current_tenant_id()
      and authz.has_permission('items.manage')
      and authz.check_permission_version()
    )
  )
);

-- UPDATE
create policy "items_update"
on public.items
for update
to authenticated
using (
  authz.is_session_valid()
  and not authz.is_account_locked()
  and (
    authz.is_system_admin()
    or (
      tenant_id = authz.current_tenant_id()
      and authz.has_permission('items.manage')
      and authz.check_permission_version()
    )
  )
)
with check (
  tenant_id = authz.current_tenant_id()
);

-- DELETE
create policy "items_delete"
on public.items
for delete
to authenticated
using (
  authz.is_session_valid()
  and not authz.is_account_locked()
  and (
    authz.is_system_admin()
    or (
      tenant_id = authz.current_tenant_id()
      and authz.has_permission('items.manage')
      and authz.check_permission_version()
    )
  )
);
```

> The `items.manage` permission covers INSERT, UPDATE, DELETE. Use `items.read` for SELECT only. Add finer granularity (e.g. `items.delete`) later if needed.

---

## 7. Tenant & Role Switching

### Tenant Switching

When a user belongs to multiple tenants, they switch context via an Edge Function:

```
POST /functions/v1/switch-tenant
Body: { "tenant_id": "uuid" }
```

#### Flow

1. Validate the user has an active membership in the target tenant
2. Update `private.auth_sessions.tenant_id` for the current session
3. Call `auth.admin.refreshSession()` to issue a new JWT with the updated `tid`, `role`, and permissions
4. Return the new session tokens to the client

The JWT hook automatically resolves the correct tenant from the session's `tenant_id`.

### Role Switching (no logout required)

A user can have multiple roles assigned but only one is active at a time. Switching roles changes the active permission set instantly.

```
POST /functions/v1/switch-role
Body: { "role_slug": "project_checker" }
```

#### Flow

1. Resolve role by slug within the user's current tenant
2. Validate the user has this role assigned (`authz.tenant_member_roles`)
3. Update `public.tenant_members.active_role_id` to the new role
4. Call `auth.admin.refreshSession()` to issue a new JWT with the updated `role` and `perms`
5. Return the new session tokens to the client
6. UI re-renders based on the new permission set

> The user stays logged in. Only the JWT claims change. No session or tenant change occurs. The frontend uses `roles` from the JWT to populate the role switcher and `role` to highlight the active one.

---

## 8. API Middleware Flow

```
1. Rate limit (IP — sliding window via Upstash Redis)
2. Validate JWT (exp, iss, aud)
3. Check is_locked claim → block if true
4. Check session_revoked claim → force re-auth if true
5. Validate permission version (pv) → force token refresh if stale
6. Resolve tenant (tid from JWT)
7. Check permission (pre-check before DB hit)
8. Query DB (RLS enforced as final boundary)
```

---

## 9. Rate Limiting

### Implementation: Upstash Redis (Edge Function compatible)

```
Strategy: Sliding window
Limits:
  - Global: 100 req/min per IP
  - Auth endpoints: 5 req/min per IP
  - Tenant-scoped: 500 req/min per tenant
```

On rate limit hit:

- Return 429
- Log `rate_limit_hit` security event (+3 risk score)
- Include `Retry-After` header

---

## 10. Abuse Protection

### Risk Scoring

| Event               | Points |
| ------------------- | ------ |
| `failed_login`      | +2     |
| `rate_limit_hit`    | +3     |
| `permission_denied` | +2     |
| `new_ip`            | +5     |
| `session_revoked`   | +1     |

### Thresholds & Actions

| Score | Action                                    |
| ----- | ----------------------------------------- |
| >= 10 | Require re-authentication (force refresh) |
| >= 20 | Revoke all sessions                       |
| >= 30 | Lock account (`private.user_risk_scores`) |

### Score Decay

Risk scores decay over time. A cron job (pg_cron or Edge Function) runs hourly:

```sql
update private.user_risk_scores
set score = greatest(score - 1, 0),
    is_locked = case when locked_until < now() then false else is_locked end,
    updated_at = now()
where score > 0 or (is_locked and locked_until < now());
```

---

## 11. Tenant Role Seeding

On tenant creation (via trigger or Edge Function):

1. Create system roles as empty tenant roles (no permissions assigned by default):
   - `tenant_admin` (is_system = true, system_role_key = 'tenant_admin')
   - `project_engineer` (is_system = true, system_role_key = 'project_engineer')
   - `project_head` (is_system = true, system_role_key = 'project_head')
   - `project_maker` (is_system = true, system_role_key = 'project_maker')
   - `project_checker` (is_system = true, system_role_key = 'project_checker')
   - `project_verifier` (is_system = true, system_role_key = 'project_verifier')
   - `project_supervisor` (is_system = true, system_role_key = 'project_supervisor')
2. System admin assigns permissions to roles after setup

> Permissions are NOT copied from system role templates. System roles only define the role structure. The system admin / tenant admin decides which permissions each role gets.

```sql
create or replace function public.handle_new_tenant()
returns trigger
language plpgsql security definer
as $$
declare
  sr record;
begin
  for sr in select * from authz.system_roles loop
    insert into authz.roles (tenant_id, name, slug, system_role_key, is_system)
    values (new.id, sr.name, sr.key, sr.key, true);
  end loop;

  return new;
end;
$$;

create trigger on_tenant_created after insert on public.tenants
  for each row execute function public.handle_new_tenant();
```

---

## 12. User & Member Management

> Users are created manually (not via email invite). Supabase Auth handles user creation. Members are assigned to tenants directly.

### Tenant Admin Assignment (system_admin only)

1. System admin calls `POST /functions/v1/assign-tenant-admin`
2. Validates caller has `is_system_admin = true`
3. Creates the user via Supabase Admin API if they don't exist
4. Creates `tenant_members` row with status = 'active'
5. Assigns the `tenant_admin` role to the user
6. System admin then assigns permissions to the `tenant_admin` role for that tenant

### Member Assignment (tenant_admin)

1. Tenant admin calls `POST /functions/v1/add-member`
2. Creates the user via Supabase Admin API if they don't exist
3. Creates `tenant_members` row with status = 'active'
4. Assigns one or more roles (e.g. `project_engineer`, `project_checker`) to the member
5. Sets `active_role_id` to the primary role

> Tenant admin can only assign members to non-admin roles. Assigning someone as `tenant_admin` requires `system_admin`. A user can later switch their active role via the UI.

---

## 13. Role Definitions

### system_admin

- NOT a normal role — stored as `is_system_admin` on `profiles` table
- Injected into JWT by the hook
- Can bypass tenant RLS (carefully controlled)
- Managed by direct DB access or protected admin Edge Function
- Responsibilities:
  - Creates tenants
  - Creates and assigns `tenant_admin` for each tenant
  - Assigns permissions to the `tenant_admin` role

### tenant_admin

- Can only be created and assigned by a `system_admin`
- Permissions on this role are assigned by `system_admin`, not self-managed
- Full access within tenant (once permissions are granted by system_admin)
- Responsibilities:
  - Manages tenant members (add, suspend, remove)
  - Assigns roles to members
  - Assigns permissions to non-admin roles

### Tenant Roles (one active per user at a time)

> A user can be assigned multiple roles but only one is active at a time (`active_role_id` on `tenant_members`). The user can switch roles via UI without logging out. Each role has its own permission set.

| Role                 | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `project_engineer`   | Day-to-day project work                       |
| `project_head`       | Oversees project, higher-level decisions      |
| `project_maker`      | Creates/authors project deliverables          |
| `project_checker`    | Reviews and checks deliverables for quality   |
| `project_verifier`   | Verifies and validates completed work         |
| `project_supervisor` | Supervises across projects, broader oversight |

- All roles start with **no permissions** by default
- `system_admin` assigns permissions to `tenant_admin`
- `tenant_admin` assigns permissions to all other roles

---

## 14. Session Management

### Session Lifecycle

1. **Create**: On login, the JWT hook binds the Supabase session to `private.auth_sessions` with IP, user agent, and tenant context
2. **Rotate**: On each token refresh, update `last_active_at` and optionally rotate `refresh_token_hash`
3. **Revoke**: Set `is_revoked = true`, `revoked_at`, `revoke_reason`. Next token refresh will strip permissions via the hook
4. **Expire**: Sessions have explicit `expires_at`. Expired sessions are ignored by the hook

### Revoke All Sessions (for a user)

```sql
update private.auth_sessions
set is_revoked = true,
    revoked_at = now(),
    revoke_reason = 'security_action'
where user_id = $1 and is_revoked = false;
```

---

## 15. Data Retention

High-volume tables (`security_events`, `audit_logs`) are **partitioned by month**. A scheduled job handles archival:

```
Retention policy:
  - security_events: 90 days hot, archive to cold storage after
  - audit_logs: 1 year hot, archive after
  - auth_sessions: delete revoked/expired sessions after 30 days
```

```sql
-- Example cleanup (run via pg_cron weekly)
delete from private.auth_sessions
where (is_revoked = true or expires_at < now())
  and created_at < now() - interval '30 days';
```

---

## 16. Permission Version Invalidation Flow

When a user's permissions change (role added/removed, role permissions modified):

1. Increment `permission_version` on the affected `tenant_members` row
2. The next request's RLS check via `authz.check_permission_version()` detects `jwt.pv < db.permission_version`
3. The RLS policy **rejects the request** (returns no rows)
4. The client receives an empty/forbidden response
5. Client-side logic detects this and calls `auth.refreshSession()` to get a fresh JWT with updated permissions

```sql
create or replace function authz.bump_permission_version(p_tenant_member_id uuid)
returns void
language plpgsql security definer
as $$
begin
  update public.tenant_members
  set permission_version = permission_version + 1,
      updated_at = now()
  where id = p_tenant_member_id;
end;
$$;
```

Trigger to auto-bump on role assignment changes:

```sql
create or replace function authz.on_member_role_change()
returns trigger
language plpgsql security definer
as $$
begin
  perform authz.bump_permission_version(
    coalesce(new.tenant_member_id, old.tenant_member_id)
  );
  return coalesce(new, old);
end;
$$;

create trigger bump_pv_on_role_change
  after insert or delete on authz.tenant_member_roles
  for each row execute function authz.on_member_role_change();
```

---

## 17. Refresh Token Reuse Detection

Protects against stolen refresh tokens. If a previously used refresh token is replayed, all sessions for that user are revoked immediately.

### How It Works

Supabase Auth already rotates refresh tokens on each use. This section adds **replay detection** on top via the application session layer.

### Schema Addition

```sql
alter table private.auth_sessions
  add column refresh_token_seq int default 0;
```

`refresh_token_seq` is incremented on every legitimate token refresh. If a request arrives with an older sequence number, it's a replay.

### Detection Flow (Edge Function middleware)

```
On token refresh:
  1. Read current session from private.auth_sessions using sid from JWT
  2. Compare incoming refresh_token_hash against stored hash
  3. If match → legitimate refresh:
     a. Increment refresh_token_seq
     b. Store new refresh_token_hash
     c. Update last_active_at
     d. Issue new tokens
  4. If mismatch (token already rotated) → REPLAY DETECTED:
     a. Revoke ALL sessions for this user (compromised token family)
     b. Log security_event: type='refresh_token_reuse', severity='critical'
     c. Increment risk score by +10
     d. Return 401, force full re-authentication
```

### Implementation

```sql
create or replace function private.handle_token_refresh(
  p_session_id uuid,
  p_incoming_token_hash text,
  p_new_token_hash text
)
returns boolean
language plpgsql security definer
as $$
declare
  session_record record;
begin
  select * into session_record
  from private.auth_sessions
  where id = p_session_id and is_revoked = false;

  if session_record is null then
    return false;
  end if;

  if session_record.refresh_token_hash != p_incoming_token_hash then
    -- REPLAY DETECTED: revoke all sessions for this user
    update private.auth_sessions
    set is_revoked = true,
        revoked_at = now(),
        revoke_reason = 'refresh_token_reuse'
    where user_id = session_record.user_id
      and is_revoked = false;

    insert into private.security_events (user_id, tenant_id, event_type, severity, metadata)
    values (
      session_record.user_id,
      session_record.tenant_id,
      'refresh_token_reuse',
      'critical',
      jsonb_build_object(
        'session_id', p_session_id,
        'action', 'all_sessions_revoked'
      )
    );

    -- Bump risk score
    insert into private.user_risk_scores (user_id, score, updated_at)
    values (session_record.user_id, 10, now())
    on conflict (user_id) do update
    set score = private.user_risk_scores.score + 10,
        updated_at = now();

    return false;
  end if;

  -- Legitimate refresh: rotate token and bump sequence
  update private.auth_sessions
  set refresh_token_hash = p_new_token_hash,
      refresh_token_seq = refresh_token_seq + 1,
      last_active_at = now()
  where id = p_session_id;

  return true;
end;
$$;
```

---

## 18. RLS Testing Automation

Automated tests that verify tenant isolation, permission enforcement, and policy correctness. Run as part of CI or via `supabase test db`.

### Approach: pgTAP tests via `supabase test db`

Each test impersonates a user by setting JWT claims, then asserts that RLS policies allow/deny correctly.

### Test Helpers

```sql
-- Helper to impersonate a user with specific claims
create or replace function tests.set_auth_context(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role text default '',
  p_perms text[] default '{}',
  p_pv int default 1,
  p_is_system_admin boolean default false,
  p_is_locked boolean default false,
  p_session_revoked boolean default false
)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_user_id,
    'tid', p_tenant_id,
    'role', p_role,
    'perms', to_jsonb(p_perms),
    'pv', p_pv,
    'is_system_admin', p_is_system_admin,
    'is_locked', p_is_locked,
    'session_revoked', p_session_revoked
  )::text, true);
end;
$$;

-- Helper to reset auth context
create or replace function tests.clear_auth_context()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;
```

### Test Cases

```sql
-- 1. Cross-tenant isolation
begin;
  select plan(2);

  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read'], 1
  );

  select is(
    (select count(*) from public.items where tenant_id = 'tenant-2-uuid')::int,
    0,
    'User in tenant-1 cannot see tenant-2 items'
  );

  select is(
    (select count(*) from public.items where tenant_id = 'tenant-1-uuid')::int > 0,
    true,
    'User in tenant-1 can see own tenant items'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;

-- 2. Permission enforcement
begin;
  select plan(2);

  -- User WITHOUT items.manage cannot insert
  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read'], 1
  );

  select throws_ok(
    'insert into public.items (tenant_id, name) values (''tenant-1-uuid'', ''test'')',
    null,
    'User without items.manage cannot insert'
  );

  -- User WITH items.manage can insert
  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read', 'items.manage'], 1
  );

  select lives_ok(
    'insert into public.items (tenant_id, name) values (''tenant-1-uuid'', ''test'')',
    'User with items.manage can insert'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;

-- 3. Revoked session blocked
begin;
  select plan(1);

  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read'], 1,
    false, false, true  -- session_revoked = true
  );

  select is(
    (select count(*) from public.items)::int,
    0,
    'Revoked session returns zero rows'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;

-- 4. Account lockout blocked
begin;
  select plan(1);

  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read'], 1,
    false, true, false  -- is_locked = true
  );

  select is(
    (select count(*) from public.items)::int,
    0,
    'Locked account returns zero rows'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;

-- 5. System admin bypasses tenant filter
begin;
  select plan(1);

  select tests.set_auth_context(
    'admin-uuid', null, '', '{}', 1,
    true, false, false  -- is_system_admin = true
  );

  select is(
    (select count(*) from public.items)::int > 0,
    true,
    'System admin can see all items across tenants'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;

-- 6. Permission version mismatch
begin;
  select plan(1);

  select tests.set_auth_context(
    'user-a-uuid', 'tenant-1-uuid', 'project_engineer',
    array['items.read'], 0  -- stale pv
  );

  select is(
    (select count(*) from public.items where tenant_id = 'tenant-1-uuid')::int,
    0,
    'Stale permission version returns zero rows'
  );

  select tests.clear_auth_context();
  select * from finish();
rollback;
```

### Running

```bash
supabase test db
```

Tests live in `supabase/tests/` as `.sql` files. They run inside transactions and roll back — no test data leaks.

---

## 19. Alerting System

Real-time alerts for security-critical events. Built on `private.security_events` with a notification layer.

### Architecture

```
security_event inserted
       ↓
Postgres trigger (pg_notify)
       ↓
Edge Function listener (webhook / cron poll)
       ↓
Alert channels: Email, Slack, Dashboard
```

### Alert Rules

| Event Type             | Severity | Channel        | Action                 |
| ---------------------- | -------- | -------------- | ---------------------- |
| `refresh_token_reuse`  | critical | Slack + Email  | Immediate alert        |
| `account_locked`       | critical | Slack + Email  | Immediate alert        |
| `all_sessions_revoked` | high     | Slack          | Alert within 1 min     |
| `failed_login` (>5/hr) | high     | Slack          | Batched alert          |
| `permission_denied`    | medium   | Dashboard only | Log for review         |
| `new_ip`               | low      | Dashboard only | Log for review         |
| `rate_limit_hit`       | medium   | Slack          | Batched alert (>10/hr) |

### Trigger: Notify on Critical/High Events

```sql
create or replace function private.notify_security_alert()
returns trigger
language plpgsql security definer
as $$
begin
  if new.severity in ('critical', 'high') then
    perform pg_notify('security_alerts', jsonb_build_object(
      'id', new.id,
      'event_type', new.event_type,
      'severity', new.severity,
      'user_id', new.user_id,
      'tenant_id', new.tenant_id,
      'ip_address', new.ip_address,
      'metadata', new.metadata,
      'created_at', new.created_at
    )::text);
  end if;
  return new;
end;
$$;

create trigger on_security_event after insert on private.security_events
  for each row execute function private.notify_security_alert();
```

### Alert Table (for dashboard + delivery tracking)

```sql
create table private.security_alerts (
  id uuid primary key default gen_random_uuid(),

  security_event_id uuid not null references private.security_events(id),

  channel text not null check (channel in ('email', 'slack', 'dashboard')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'acknowledged')),

  recipient text,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),

  created_at timestamptz default now()
);

create index idx_security_alerts_status on private.security_alerts(status, created_at);
```

### Alert Dispatcher (Edge Function — cron every 1 min)

```
POST /functions/v1/dispatch-alerts (triggered by pg_cron or Supabase cron)

1. Query pending alerts from private.security_alerts
2. Group by channel:
   - Slack: send via webhook (batched per severity)
   - Email: send via Resend/Postmark to system_admin emails
   - Dashboard: already visible (status = 'pending' for UI to query)
3. Update status to 'sent' with sent_at
4. On failure: update status to 'failed', retry on next run
```

### Alert Creator (runs after security event insert)

```sql
create or replace function private.create_security_alerts()
returns trigger
language plpgsql security definer
as $$
begin
  -- Critical: email + slack + dashboard
  if new.severity = 'critical' then
    insert into private.security_alerts (security_event_id, channel)
    values
      (new.id, 'email'),
      (new.id, 'slack'),
      (new.id, 'dashboard');
  -- High: slack + dashboard
  elsif new.severity = 'high' then
    insert into private.security_alerts (security_event_id, channel)
    values
      (new.id, 'slack'),
      (new.id, 'dashboard');
  -- Medium/Low: dashboard only
  else
    insert into private.security_alerts (security_event_id, channel)
    values (new.id, 'dashboard');
  end if;

  return new;
end;
$$;

create trigger on_security_event_create_alerts
  after insert on private.security_events
  for each row execute function private.create_security_alerts();
```

### Dashboard Query (for system_admin UI)

```sql
select
  sa.id,
  sa.channel,
  sa.status,
  se.event_type,
  se.severity,
  se.user_id,
  se.tenant_id,
  se.ip_address,
  se.metadata,
  se.created_at as event_at,
  sa.created_at as alert_at
from private.security_alerts sa
join private.security_events se on se.id = sa.security_event_id
where sa.channel = 'dashboard'
  and sa.status in ('pending', 'sent')
order by se.created_at desc;
```

System admin acknowledges alerts via:

```sql
update private.security_alerts
set status = 'acknowledged',
    acknowledged_at = now(),
    acknowledged_by = $1
where id = $2;
```

---

## 20. Testing Checklist

- [ ] Cross-tenant access blocked (user A cannot see tenant B data)
- [ ] System admin bypasses tenant filter correctly
- [ ] Tenant isolation enforced at RLS level
- [ ] Revoked session returns empty/blocked results
- [ ] Permission version mismatch blocks stale JWT
- [ ] Account lockout prevents all operations
- [ ] Permission checks correct for each operation (select/insert/update/delete)
- [ ] RLS cannot be bypassed via direct table access
- [ ] Member assignment works end-to-end (create user, add to tenant, assign role)
- [ ] Tenant switching issues correct JWT
- [ ] Role switching updates JWT with new role's permissions only
- [ ] User with multiple roles can only use active role's permissions
- [ ] Switching role does not require re-login
- [ ] Audit logs capture insert, update, delete automatically
- [ ] Rate limiting returns 429 and logs event
- [ ] Risk score accumulation triggers lockout at threshold
- [ ] Cascade deletes clean up orphaned data
- [ ] Refresh token reuse revokes all user sessions
- [ ] Refresh token reuse logs critical security event
- [ ] RLS pgTAP tests pass via `supabase test db`
- [ ] Critical/high security events generate alerts
- [ ] Alert dispatch sends to correct channels by severity

---

## 21. Core Principles

- Permissions are the **ONLY** enforcement layer
- Roles are just grouping containers
- JWT is for performance (avoid DB joins in hot path)
- Database is the source of truth (JWT is a cache)
- RLS is the **final** security boundary
- System admin is NOT a tenant role
- Session validity is checked at both hook and RLS level
- Permission staleness is detected and forces refresh
- Every schema has explicit access control (GRANT/REVOKE)
- Audit and security logs are captured automatically, not manually

---

## Golden Rule

```
Data      → public
Decisions → authz
Secrets   → private
```
