-- ==========================================================================
-- Seed: Local Development Test Fixtures
-- ==========================================================================
-- This file runs ONLY on `supabase db reset` (local dev). It is NOT applied
-- to preview or production environments.
--
-- Prerequisites: the 20260407114000_seed_data migration has already created
-- the KKM Infra tenant, permissions, roles, and tenant_admin permissions.
-- ==========================================================================

do $$
declare
  v_tenant_id      uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_admin_id       uuid := 'b1ffcd00-ad1c-5f09-cc7e-7ccace491b22';
  v_engineer_id    uuid := 'cccccccc-1111-2222-3333-444444444401';
  v_checker_id     uuid := 'cccccccc-1111-2222-3333-444444444402';
  v_supervisor_id  uuid := 'cccccccc-1111-2222-3333-444444444403';
  v_dev_password   text := 'password';
begin

  -- ── Dev system admin (local only) ───────────────────────────────────

  alter table public.profiles disable trigger protect_profiles_system_admin;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@dev.local',
    crypt(v_dev_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "Dev Admin"}'::jsonb,
    now(), now(), '', ''
  ) on conflict (id) do nothing;

  update public.profiles
  set is_system_admin = true,
      display_name = 'Dev Admin'
  where id = v_admin_id;

  alter table public.profiles enable trigger protect_profiles_system_admin;

  perform public.sync_tenant_member_roles(
    v_tenant_id, v_admin_id,
    ARRAY['tenant_admin'], 'tenant_admin'
  );

  -- ── Dev user: Project Engineer ──────────────────────────────────────

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values (
    v_engineer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer@dev.local',
    crypt(v_dev_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "Dev Engineer"}'::jsonb,
    now(), now(), '', ''
  ) on conflict (id) do nothing;

  perform public.sync_tenant_member_roles(
    v_tenant_id, v_engineer_id,
    ARRAY['project_engineer'], 'project_engineer'
  );

  -- ── Dev user: Project Checker ───────────────────────────────────────

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values (
    v_checker_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'checker@dev.local',
    crypt(v_dev_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "Dev Checker"}'::jsonb,
    now(), now(), '', ''
  ) on conflict (id) do nothing;

  perform public.sync_tenant_member_roles(
    v_tenant_id, v_checker_id,
    ARRAY['project_checker'], 'project_checker'
  );

  -- ── Dev user: Project Supervisor ────────────────────────────────────

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values (
    v_supervisor_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'supervisor@dev.local',
    crypt(v_dev_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "Dev Supervisor"}'::jsonb,
    now(), now(), '', ''
  ) on conflict (id) do nothing;

  perform public.sync_tenant_member_roles(
    v_tenant_id, v_supervisor_id,
    ARRAY['project_supervisor'], 'project_supervisor'
  );

  -- ── Grant read permissions to dev roles ─────────────────────────────

  insert into authz.role_permissions (role_id, permission_id)
  select r.id, p.id
  from authz.roles r
  join authz.permissions p on p.key in ('items.read', 'tenants.read', 'roles.read')
  where r.tenant_id = v_tenant_id
    and r.slug in ('project_engineer', 'project_checker')
  on conflict do nothing;

  insert into authz.role_permissions (role_id, permission_id)
  select r.id, p.id
  from authz.roles r
  join authz.permissions p on p.key in (
    'items.read', 'items.manage', 'tenants.read', 'roles.read',
    'members.manage', 'audit.read', 'alerts.read'
  )
  where r.tenant_id = v_tenant_id
    and r.slug = 'project_supervisor'
  on conflict do nothing;

end;
$$;
