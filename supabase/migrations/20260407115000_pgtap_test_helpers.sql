-- ==========================================================================
-- Migration: pgTAP Test Helpers
-- ==========================================================================
-- Provides helper functions for RLS integration tests.
--
-- tests.set_auth_context() simulates an authenticated user by setting
-- the `role` GUC to 'authenticated' and `request.jwt.claims` to a
-- JSON object matching what the custom_access_token_hook produces.
--
-- NOTE: No p_perms parameter — permissions are resolved at the DB level
-- by authz.has_permission() from role_permissions, not from JWT claims.
--
-- SECURITY: Granted ONLY to postgres (the test runner). NOT granted
-- to authenticated — prevents clients from overriding JWT claims.
-- ==========================================================================

create schema if not exists tests;

create extension if not exists pgtap schema tests;

-- Simulate an authenticated user with specific JWT claims for testing.
-- Set `p_is_locked` or `p_session_revoked` to test guard policies.
create or replace function tests.set_auth_context(
  p_user_id uuid,
  p_tenant_id uuid,
  p_active_role text default '',
  p_pv integer default 1,
  p_is_system_admin boolean default false,
  p_is_locked boolean default false,
  p_session_revoked boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id,
      'role', 'authenticated',
      'tid', p_tenant_id,
      'active_role', p_active_role,
      'pv', p_pv,
      'is_system_admin', p_is_system_admin,
      'is_locked', p_is_locked,
      'session_revoked', p_session_revoked
    )::text,
    true
  );
end;
$$;

create or replace function tests.clear_auth_context()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{}'::jsonb::text, true);
end;
$$;

grant usage on schema tests to postgres;
grant execute on function tests.set_auth_context(uuid, uuid, text, integer, boolean, boolean, boolean) to postgres;
grant execute on function tests.clear_auth_context() to postgres;

-- authenticated needs access to call test helpers when impersonating via set_auth_context
grant usage on schema tests to authenticated;
grant execute on function tests.set_auth_context(uuid, uuid, text, integer, boolean, boolean, boolean) to authenticated;
grant execute on function tests.clear_auth_context() to authenticated;
