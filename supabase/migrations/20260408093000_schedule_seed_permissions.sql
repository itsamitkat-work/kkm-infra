-- ==========================================================================
-- Migration: Schedule of Rates — Seed Permissions
-- ==========================================================================
-- Adds schedule-related permission keys and grants them to the
-- tenant_admin role for the initial KKM Infra tenant.
-- ==========================================================================

insert into authz.permissions (key, description)
values
  ('schedules.read',   'View schedule of rates data'),
  ('schedules.manage', 'Create, update, and manage schedule data')
on conflict (key) do update
set description = excluded.description;

-- Grant new permissions to tenant_admin for KKM Infra
insert into authz.role_permissions (role_id, permission_id)
select r.id, p.id
from authz.roles r
cross join authz.permissions p
where r.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  and r.slug = 'tenant_admin'
  and p.key in ('schedules.read', 'schedules.manage')
on conflict do nothing;
