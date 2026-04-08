-- ==========================================================================
-- Migration: Seed Data (Permissions, Roles, Initial Tenant)
-- ==========================================================================
-- Consolidated seed migration that runs identically on all environments.
--
-- Contents:
--   1. Global permission keys
--   2. System role templates
--   3. Initial tenant (KKM Infra)
--   4. Grant ALL permissions to the tenant_admin role
--
-- The system admin user is NOT created here. After deployment, the first
-- admin should sign up via Supabase Auth (email/OAuth/magic-link), then
-- be promoted via a one-time SQL command:
--
--   UPDATE public.profiles SET is_system_admin = true WHERE id = '<user-uuid>';
--   SELECT public.sync_tenant_member_roles('<tenant-uuid>', '<user-uuid>',
--     ARRAY['tenant_admin'], 'tenant_admin');
--
-- All inserts are idempotent (ON CONFLICT DO NOTHING / DO UPDATE).
-- ==========================================================================

-- ── 1. Permissions ──────────────────────────────────────────────────────

insert into authz.permissions (key, description)
values
  ('items.read',            'Read tenant items'),
  ('items.manage',          'Create, update, and delete tenant items'),
  ('members.manage',        'Add, update, suspend, and remove tenant members'),
  ('roles.read',            'Read tenant roles and permissions'),
  ('roles.manage',          'Manage tenant role definitions and permission mappings'),
  ('roles.assign',          'Assign roles to tenant members'),
  ('tenants.read',          'Read tenant metadata'),
  ('tenants.manage',        'Update tenant metadata'),
  ('alerts.read',           'Read security alerts'),
  ('alerts.acknowledge',    'Acknowledge security alerts'),
  ('sessions.revoke',       'Revoke active sessions'),
  ('audit.read',            'Read audit logs'),
  ('profiles.manage',       'Manage user profiles')
on conflict (key) do update
set description = excluded.description;

-- ── 2. System roles ─────────────────────────────────────────────────────

insert into authz.system_roles (key, name, description)
values
  ('tenant_admin',        'Tenant Admin',        'Administrative role for a single tenant'),
  ('project_engineer',    'Project Engineer',     'Day-to-day project execution role'),
  ('project_head',        'Project Head',         'High-level project oversight role'),
  ('project_maker',       'Project Maker',        'Creates and authors project deliverables'),
  ('project_checker',     'Project Checker',      'Checks project deliverables for quality'),
  ('project_verifier',    'Project Verifier',     'Verifies completed project work'),
  ('project_supervisor',  'Project Supervisor',   'Broad project supervision role')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

-- ── 3. Initial tenant ───────────────────────────────────────────────────
-- handle_new_tenant trigger fires on INSERT, copying system_roles → authz.roles

insert into public.tenants (id, name, display_name, slug)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KKM Infra', 'KKM Infra', 'kkm-infra')
on conflict (slug) do nothing;

-- ── 4. Grant ALL permissions to tenant_admin role ─────────────────────
-- The tenant_admin for KKM Infra gets every permission key.

insert into authz.role_permissions (role_id, permission_id)
select r.id, p.id
from authz.roles r
cross join authz.permissions p
where r.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  and r.slug = 'tenant_admin'
on conflict do nothing;
