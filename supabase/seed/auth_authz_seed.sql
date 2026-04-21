-- ==========================================================================
-- Auth + Authz seed (SQL only — local / CI dev)
-- ==========================================================================
-- Runs after migrations via config.toml `db.seed.sql_paths`.
-- Order: role_templates, permissions, role_template_permissions (defaults per template),
-- tenants (handle_new_tenant → tenant_roles + tenant_role_permissions), users, memberships.
-- Covers: authz.role_templates, authz.permissions, authz.role_template_permissions,
-- public.tenants, authz.tenant_roles (via tenant trigger), authz.tenant_role_permissions,
-- auth.users, auth.identities,
-- public.profiles (is_system_admin), public.tenant_members + member roles
-- (via public.sync_tenant_member_roles).
--
-- Dev passwords (all seeded users): 22113355 — change for anything beyond local dev.
-- Edit emails / UUIDs here if you rename dev accounts.
--
-- Project drawer (KKM tenant): tenant_roles named with a Project … prefix; slugs are
-- project_maker, project_checker, project_verifier, project_head, project_engineer,
-- project_supervisor (see apps/web/types/project-member-roles.ts).
-- Seed users use project.* emails and Project … display names for clarity in pickers.
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
    ('schedules.read', 'View schedule and schedule items'),
    (
      'tenants.manage',
      'Platform: create, update, and delete tenants (RLS uses is_system_admin only)'
    )
) as v (key, description)
on conflict (key) do update
set description = excluded.description;

-- --------------------------------------------------------------------------
-- authz.role_template_permissions (defaults copied per tenant by handle_new_tenant)
-- --------------------------------------------------------------------------
-- tenants.manage is only on platform_admin; tenant_admin stays inside the tenant.
insert into authz.role_template_permissions (template_key, permission_id)
select 'tenant_admin', p.id
from authz.permissions p
where p.key <> 'tenants.manage'
on conflict (template_key, permission_id) do nothing;

insert into authz.role_template_permissions (template_key, permission_id)
select 'platform_admin', p.id
from authz.permissions p
on conflict (template_key, permission_id) do nothing;

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

-- tenant_role_permissions for the rows above are filled by public.handle_new_tenant()
-- from authz.role_template_permissions (same transaction, after this section runs).

-- --------------------------------------------------------------------------
-- Project team roles for KKM tenant (project drawer user pickers)
-- Role names: Project … prefix. Slugs must match ProjectMemberRoleSlug in apps/web/types/project-member-roles.ts.
-- --------------------------------------------------------------------------
insert into authz.tenant_roles (tenant_id, name, slug, template_key, is_system)
select v.tenant_id, v.name, v.slug, null::text, false
from (
  values
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Head',
      'project_head'
    ),
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Engineer',
      'project_engineer'
    ),
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Supervisor',
      'project_supervisor'
    ),
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Maker (estimation)',
      'project_maker'
    ),
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Checker (estimation)',
      'project_checker'
    ),
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Project — Verifier (estimation)',
      'project_verifier'
    )
) as v(tenant_id, name, slug)
where not exists (
  select 1
  from authz.tenant_roles tr
  where tr.tenant_id = v.tenant_id
    and tr.slug = v.slug
);

insert into authz.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, ta_perm.permission_id
from authz.tenant_roles tr
cross join lateral (
  select trp.permission_id
  from authz.tenant_role_permissions trp
  inner join authz.tenant_roles admin on admin.id = trp.tenant_role_id
  where admin.tenant_id = tr.tenant_id
    and admin.slug = 'tenant_admin'
) ta_perm
where tr.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
  and tr.slug in (
    'project_head',
    'project_engineer',
    'project_supervisor',
    'project_maker',
    'project_checker',
    'project_verifier'
  )
on conflict (tenant_role_id, permission_id) do nothing;

-- Align role labels on re-seed (insert above is no-op if rows already exist).
update authz.tenant_roles tr
set
  name = case tr.slug
    when 'project_head' then 'Project — Head'
    when 'project_engineer' then 'Project — Engineer'
    when 'project_supervisor' then 'Project — Supervisor'
    when 'project_maker' then 'Project — Maker (estimation)'
    when 'project_checker' then 'Project — Checker (estimation)'
    when 'project_verifier' then 'Project — Verifier (estimation)'
    else tr.name
  end,
  updated_at = now()
where tr.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
  and tr.slug in (
    'project_head',
    'project_engineer',
    'project_supervisor',
    'project_maker',
    'project_checker',
    'project_verifier'
  );

-- --------------------------------------------------------------------------
-- auth.users + auth.identities (fixed UUIDs for stable local dev)
-- --------------------------------------------------------------------------
delete from auth.users
where lower(email) in (
  lower('its.amit.kat@gmail.com'),
  lower('tenant.admin@kkm-infra.local'),
  lower('seed.projecthead@kkm-infra.local'),
  lower('seed.engineer@kkm-infra.local'),
  lower('seed.supervisor@kkm-infra.local'),
  lower('seed.maker@kkm-infra.local'),
  lower('seed.checker@kkm-infra.local'),
  lower('seed.verifier@kkm-infra.local'),
  lower('seed.engineer.alt@kkm-infra.local'),
  lower('seed.checker.alt@kkm-infra.local'),
  lower('seed.project.head@kkm-infra.local'),
  lower('seed.project.engineer@kkm-infra.local'),
  lower('seed.project.supervisor@kkm-infra.local'),
  lower('seed.project.maker@kkm-infra.local'),
  lower('seed.project.checker@kkm-infra.local'),
  lower('seed.project.verifier@kkm-infra.local'),
  lower('seed.project.engineer.alt@kkm-infra.local'),
  lower('seed.project.checker.alt@kkm-infra.local')
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
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333301-1111-4111-8111-111111113301'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.head@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Head (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333302-1111-4111-8111-111111113302'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.engineer@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Engineer (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333303-1111-4111-8111-111111113303'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.supervisor@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Supervisor (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333304-1111-4111-8111-111111113304'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.maker@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Maker (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333305-1111-4111-8111-111111113305'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.checker@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Checker (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333306-1111-4111-8111-111111113306'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.verifier@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Verifier (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333307-1111-4111-8111-111111113307'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.engineer.alt@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Engineer alt (dev)"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ee333308-1111-4111-8111-111111113308'::uuid,
    'authenticated',
    'authenticated',
    'seed.project.checker.alt@kkm-infra.local',
    extensions.crypt('22113355', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Project · Checker alt (dev)"}'::jsonb,
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
  ),
  (
    gen_random_uuid(),
    'ee333301-1111-4111-8111-111111113301',
    'ee333301-1111-4111-8111-111111113301'::uuid,
    jsonb_build_object(
      'sub',
      'ee333301-1111-4111-8111-111111113301',
      'email',
      'seed.project.head@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333302-1111-4111-8111-111111113302',
    'ee333302-1111-4111-8111-111111113302'::uuid,
    jsonb_build_object(
      'sub',
      'ee333302-1111-4111-8111-111111113302',
      'email',
      'seed.project.engineer@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333303-1111-4111-8111-111111113303',
    'ee333303-1111-4111-8111-111111113303'::uuid,
    jsonb_build_object(
      'sub',
      'ee333303-1111-4111-8111-111111113303',
      'email',
      'seed.project.supervisor@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333304-1111-4111-8111-111111113304',
    'ee333304-1111-4111-8111-111111113304'::uuid,
    jsonb_build_object(
      'sub',
      'ee333304-1111-4111-8111-111111113304',
      'email',
      'seed.project.maker@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333305-1111-4111-8111-111111113305',
    'ee333305-1111-4111-8111-111111113305'::uuid,
    jsonb_build_object(
      'sub',
      'ee333305-1111-4111-8111-111111113305',
      'email',
      'seed.project.checker@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333306-1111-4111-8111-111111113306',
    'ee333306-1111-4111-8111-111111113306'::uuid,
    jsonb_build_object(
      'sub',
      'ee333306-1111-4111-8111-111111113306',
      'email',
      'seed.project.verifier@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333307-1111-4111-8111-111111113307',
    'ee333307-1111-4111-8111-111111113307'::uuid,
    jsonb_build_object(
      'sub',
      'ee333307-1111-4111-8111-111111113307',
      'email',
      'seed.project.engineer.alt@kkm-infra.local'
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'ee333308-1111-4111-8111-111111113308',
    'ee333308-1111-4111-8111-111111113308'::uuid,
    jsonb_build_object(
      'sub',
      'ee333308-1111-4111-8111-111111113308',
      'email',
      'seed.project.checker.alt@kkm-infra.local'
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

update public.profiles p
set username = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id
  and u.id in (
    'ee333301-1111-4111-8111-111111113301'::uuid,
    'ee333302-1111-4111-8111-111111113302'::uuid,
    'ee333303-1111-4111-8111-111111113303'::uuid,
    'ee333304-1111-4111-8111-111111113304'::uuid,
    'ee333305-1111-4111-8111-111111113305'::uuid,
    'ee333306-1111-4111-8111-111111113306'::uuid,
    'ee333307-1111-4111-8111-111111113307'::uuid,
    'ee333308-1111-4111-8111-111111113308'::uuid
  );

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

-- KKM tenant: one membership per project-drawer role (+ alt engineer / checker for picker variety)
select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333301-1111-4111-8111-111111113301'::uuid,
  array['project_head']::text[],
  'project_head',
  'Project · Head (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333302-1111-4111-8111-111111113302'::uuid,
  array['project_engineer']::text[],
  'project_engineer',
  'Project · Engineer (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333303-1111-4111-8111-111111113303'::uuid,
  array['project_supervisor']::text[],
  'project_supervisor',
  'Project · Supervisor (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333304-1111-4111-8111-111111113304'::uuid,
  array['project_maker']::text[],
  'project_maker',
  'Project · Maker (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333305-1111-4111-8111-111111113305'::uuid,
  array['project_checker']::text[],
  'project_checker',
  'Project · Checker (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333306-1111-4111-8111-111111113306'::uuid,
  array['project_verifier']::text[],
  'project_verifier',
  'Project · Verifier (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333307-1111-4111-8111-111111113307'::uuid,
  array['project_engineer']::text[],
  'project_engineer',
  'Project · Engineer alt (dev)',
  null::text
);

select public.sync_tenant_member_roles(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'ee333308-1111-4111-8111-111111113308'::uuid,
  array['project_checker']::text[],
  'project_checker',
  'Project · Checker alt (dev)',
  null::text
);

commit;
