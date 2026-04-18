begin;

set search_path to tests, public, authz, private;

select plan(8);

do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  admin_user uuid := '33333333-3333-3333-3333-333333333333';
  managed_user uuid := 'aaaaaaaa-1111-1111-1111-111111111111';
  tenant_1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  tenant_2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  engineer_role uuid := '44444444-4444-4444-4444-444444444444';
  members_manage_permission uuid;
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@example.com', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@example.com', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (admin_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', '{}'::jsonb, '{}'::jsonb, now(), now()),
    (managed_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'managed@example.com', '{}'::jsonb, '{}'::jsonb, now(), now())
  on conflict (id) do nothing;

  -- Disable the system admin guard trigger during test data setup
  alter table public.profiles disable trigger protect_profiles_system_admin;

  insert into public.profiles (id, display_name, is_system_admin)
  values
    (user_a, 'User A', false),
    (user_b, 'User B', false),
    (admin_user, 'Admin User', true)
  on conflict (id) do update
  set display_name = excluded.display_name,
      is_system_admin = excluded.is_system_admin;

  alter table public.profiles enable trigger protect_profiles_system_admin;

  insert into public.tenants (id, name, slug)
  values
    (tenant_1, 'Tenant 1', 'tenant-1'),
    (tenant_2, 'Tenant 2', 'tenant-2')
  on conflict (id) do nothing;

  select r.id
  into engineer_role
  from authz.tenant_roles r
  where r.tenant_id = tenant_1
    and r.slug = 'project_engineer'
  limit 1;

  insert into public.tenant_members (id, tenant_id, user_id, active_role_id)
  values
    ('55555555-5555-5555-5555-555555555555', tenant_1, user_a, engineer_role),
    ('66666666-6666-6666-6666-666666666666', tenant_2, user_b, null)
  on conflict (tenant_id, user_id) do nothing;

  select p.id
  into members_manage_permission
  from authz.permissions p
  where p.key = 'tenant_members.manage'
  limit 1;

  insert into authz.role_permissions (role_id, permission_id)
  values (engineer_role, members_manage_permission)
  on conflict do nothing;

  insert into authz.tenant_member_roles (tenant_member_id, role_id)
  values ('55555555-5555-5555-5555-555555555555', engineer_role)
  on conflict do nothing;

  update public.tenant_members
  set permission_version = 1
  where id = '55555555-5555-5555-5555-555555555555';
end
$$;

-- Permissions are now resolved from DB (role_permissions), not JWT.
-- The test data above already assigns tenant_members.manage to the engineer_role.

select tests.set_auth_context(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'project_engineer'::text,
  1
);

select is(
  (select count(*)::int from public.tenant_members where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'Cross-tenant members remain hidden'
);

select is(
  (select count(*)::int from public.tenant_members where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'User can read their own tenant member row'
);

-- Insert test: user has tenant_members.manage via role_permissions in the DB
select lives_ok(
  $$insert into public.tenant_members (tenant_id, user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-111111111111')$$,
  'Insert works — tenant_members.manage resolved from DB role_permissions'
);

-- To test INSERT blocked, we remove the permission from the role first
select tests.clear_auth_context();

delete from authz.role_permissions
where role_id = (
  select r.id from authz.tenant_roles r
  where r.tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and r.slug = 'project_engineer'
);

-- Reset permission version so PV check passes
update public.tenant_members
set permission_version = 1
where id = '55555555-5555-5555-5555-555555555555';

select tests.set_auth_context(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'project_engineer'::text,
  1
);

select throws_ok(
  $$insert into public.tenant_members (tenant_id, user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999')$$,
  '42501'
);

select tests.set_auth_context(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'project_engineer'::text,
  1,
  false,
  false,
  true
);

select is(
  (select count(*)::int from public.tenant_members),
  0,
  'Revoked sessions return no rows'
);

select tests.set_auth_context(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'project_engineer'::text,
  1,
  false,
  true,
  false
);

select is(
  (select count(*)::int from public.tenant_members),
  0,
  'Locked accounts return no rows'
);

select tests.set_auth_context(
  '33333333-3333-3333-3333-333333333333'::uuid,
  null::uuid,
  ''::text,
  1,
  true,
  false,
  false
);

select ok(
  (select count(*)::int from public.tenant_members) >= 2,
  'System admin bypasses tenant isolation'
);

select tests.set_auth_context(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'project_engineer'::text,
  0
);

select is(
  (select count(*)::int from public.tenant_members where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'Stale permission versions are rejected'
);

select tests.clear_auth_context();
select * from finish();

rollback;
