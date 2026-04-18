-- ==========================================================================
-- Migration: Row-Level Security Policies
-- ==========================================================================
-- Defines RLS for public.tenants, public.profiles, public.tenant_members.
--
-- All policies enforce two baseline guards:
--   authz.is_session_valid()      – session is not revoked
--   not authz.is_account_locked() – user risk score < lock threshold
--
-- tenant_members policies additionally require:
--   authz.check_permission_version() – JWT pv matches DB (stale guard)
--
-- System admins (is_system_admin=true) bypass tenant-scoped checks.
-- Self-row visibility in tenant_members is scoped to the current tenant
-- to prevent cross-tenant membership enumeration.
--
-- PERFORMANCE: All auth.*() and authz.*() calls are wrapped in
-- (SELECT ...) so Postgres evaluates them once per query, not per row.
-- ==========================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tenant_members to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;

-- ── tenants ─────────────────────────────────────────────────────────────

drop policy if exists tenants_select on public.tenants;
create policy tenants_select
on public.tenants
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = tenants.id
        and tm.user_id = (select auth.uid())
        and tm.status = 'active'
    )
  )
);

drop policy if exists tenants_insert on public.tenants;
create policy tenants_insert
on public.tenants
for insert
to authenticated
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.is_system_admin())
);

drop policy if exists tenants_update on public.tenants;
create policy tenants_update
on public.tenants
for update
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.is_system_admin())
)
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.is_system_admin())
);

drop policy if exists tenants_delete on public.tenants;
create policy tenants_delete
on public.tenants
for delete
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.is_system_admin())
);

-- ── profiles ────────────────────────────────────────────────────────────

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or id = (select auth.uid())
    or is_public = true
    or exists (
      select 1
      from public.tenant_members current_tm
      join public.tenant_members profile_tm
        on profile_tm.user_id = profiles.id
       and profile_tm.tenant_id = current_tm.tenant_id
      where current_tm.user_id = (select auth.uid())
        and current_tm.status = 'active'
        and profile_tm.status = 'active'
    )
  )
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
on public.profiles
for insert
to authenticated
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or id = (select auth.uid())
  )
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or id = (select auth.uid())
  )
)
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or id = (select auth.uid())
  )
);

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete
on public.profiles
for delete
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (select authz.is_system_admin())
);

-- ── tenant_members ──────────────────────────────────────────────────────

drop policy if exists tenant_members_select on public.tenant_members;
create policy tenant_members_select
on public.tenant_members
for select
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      (select authz.check_permission_version())
      and (
        (user_id = (select auth.uid()) and tenant_id = (select authz.current_tenant_id()))
        or (
          tenant_id = (select authz.current_tenant_id())
          and (select authz.has_permission('tenant_members.manage'))
        )
      )
    )
  )
);

drop policy if exists tenant_members_insert on public.tenant_members;
create policy tenant_members_insert
on public.tenant_members
for insert
to authenticated
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);

drop policy if exists tenant_members_update on public.tenant_members;
create policy tenant_members_update
on public.tenant_members
for update
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
)
with check (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);

drop policy if exists tenant_members_delete on public.tenant_members;
create policy tenant_members_delete
on public.tenant_members
for delete
to authenticated
using (
  (select authz.is_session_valid())
  and not (select authz.is_account_locked())
  and (
    (select authz.is_system_admin())
    or (
      tenant_id = (select authz.current_tenant_id())
      and (select authz.has_permission('tenant_members.manage'))
      and (select authz.check_permission_version())
    )
  )
);
