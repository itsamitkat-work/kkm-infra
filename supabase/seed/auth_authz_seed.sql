-- ==========================================================================
-- Auth + Authz seed (SQL only — local / CI dev)
-- ==========================================================================
-- Runs after migrations via config.toml `db.seed.sql_paths`.
-- Order: role_templates first (catalog), then permissions, tenants (creates tenant_roles),
-- tenant_role_permissions, users, memberships. See sections below.
-- Covers: authz.role_templates, authz.permissions, public.tenants, authz.tenant_roles
-- (via tenant trigger), authz.tenant_role_permissions, auth.users, auth.identities,
-- public.profiles (is_system_admin), public.tenant_members + member roles
-- (via public.sync_tenant_member_roles).
--
-- Dev passwords (both users): 22113355 — change for anything beyond local dev.
-- Edit emails / UUIDs here if you rename dev accounts.
-- ==========================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------------
-- authz.role_templates (seed first: tenant insert copies each row → tenant_roles)
-- --------------------------------------------------------------------------
insert into authz.role_templates (key, name, description)
values
  (
    'tenant_admin',
    'Tenant Admin',
    'Administrative role for a single tenant (excludes tenants.manage)'
  ),
  (
    'platform_admin',
    'Platform Admin',
    'Full permission set per tenant, including tenants.manage'
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

-- --------------------------------------------------------------------------
-- authz.permissions (keys referenced by authz.has_permission in RLS migrations)
-- --------------------------------------------------------------------------
-- Add new rows here when you introduce a permission in a policy. Keys must
-- exist before tenant_role_permissions can link them.
insert into authz.permissions (key, description)
select v.key, v.description
from (
  values
    ('basic_rates.read', 'View basic rates and related reference data'),
    ('basic_rates.manage', 'Create, update, and delete basic rates and types'),
    ('clients.read', 'View clients'),
    ('clients.manage', 'Create, update, and delete clients'),
    ('tenant_members.manage', 'Add, update, suspend, and remove tenant members'),
    ('projects.read', 'View projects'),
    ('projects.manage', 'Create, update, and delete projects'),
    ('schedules.manage', 'Create, update, and manage schedule data'),
    (
      'tenants.manage',
      'Platform: create, update, and delete tenants (RLS uses is_system_admin only)'
    )
) as v (key, description)
on conflict (key) do update
set description = excluded.description;

-- --------------------------------------------------------------------------
-- public.tenants
-- --------------------------------------------------------------------------
insert into public.tenants (id, name, display_name, slug)
values
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'KKM Infra',
    'KKM Infra',
    'kkm-infra'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Test Infra',
    'Test Infra',
    'test-infra'
  )
on conflict (slug) do update
set
  name = excluded.name,
  display_name = excluded.display_name;

-- tenant_admin: every seeded permission EXCEPT tenants.manage.
-- tenants.manage exists only for platform operators (platform_admin). It must never
-- appear on tenant_admin — your customers stay inside their tenant; creating tenants
-- is blocked in RLS by is_system_admin() anyway, but the catalog grant stays exclusive.
insert into authz.tenant_role_permissions (tenant_role_id, permission_id)
select r.id, p.id
from authz.tenant_roles r
join authz.permissions p on p.key <> 'tenants.manage'
where
  r.slug = 'tenant_admin'
  and r.tenant_id in (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid
  )
on conflict (tenant_role_id, permission_id) do nothing;

-- platform_admin ONLY: full cross-product including tenants.manage (dev system admin user).
insert into authz.tenant_role_permissions (tenant_role_id, permission_id)
select r.id, p.id
from authz.tenant_roles r
cross join authz.permissions p
where
  r.slug = 'platform_admin'
  and r.tenant_id in (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid
  )
on conflict (tenant_role_id, permission_id) do nothing;

-- Strip tenants.manage from tenant_admin if anything re-attached it (re-seed / manual edits).
delete from authz.tenant_role_permissions trp
using authz.permissions perm, authz.tenant_roles r
where trp.permission_id = perm.id
  and trp.tenant_role_id = r.id
  and perm.key = 'tenants.manage'
  and r.slug = 'tenant_admin';

-- --------------------------------------------------------------------------
-- auth.users + auth.identities (fixed UUIDs for stable local dev)
-- --------------------------------------------------------------------------
delete from auth.users
where lower(email) in (
  lower('its.amit.kat@gmail.com'),
  lower('tenant.admin@kkm-infra.local')
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee111111-1111-4111-8111-111111111101'::uuid,
    'authenticated',
    'authenticated',
    'its.amit.kat@gmail.com',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"System Admin (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee222222-2222-4222-8222-222222222202'::uuid,
    'authenticated',
    'authenticated',
    'tenant.admin@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Tenant Admin (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid(),
    'ee111111-1111-4111-8111-111111111101',
    'ee111111-1111-4111-8111-111111111101'::uuid,
    jsonb_build_object(
      'sub',
      'ee111111-1111-4111-8111-111111111101',
      'email',
      'its.amit.kat@gmail.com'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee222222-2222-4222-8222-222222222202',
    'ee222222-2222-4222-8222-222222222202'::uuid,
    jsonb_build_object(
      'sub',
      'ee222222-2222-4222-8222-222222222202',
      'email',
      'tenant.admin@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  );

alter table public.profiles disable trigger protect_profiles_system_admin;

update public.profiles
set is_system_admin = true
where id = 'ee111111-1111-4111-8111-111111111101'::uuid;

update public.profiles
set is_system_admin = false
where id = 'ee222222-2222-4222-8222-222222222202'::uuid;

alter table public.profiles enable trigger protect_profiles_system_admin;

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee111111-1111-4111-8111-111111111101'::uuid,
  array['platform_admin']::text[],
  'platform_admin',
  'System Admin (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee222222-2222-4222-8222-222222222202'::uuid,
  array['tenant_admin']::text[],
  'tenant_admin',
  'Tenant Admin (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
  'ee222222-2222-4222-8222-222222222202'::uuid,
  array['tenant_admin']::text[],
  'tenant_admin',
  'Tenant Admin (dev)',
  null::text
);

commit;
