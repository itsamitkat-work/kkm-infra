-- Catalog permission for platform tenant management; no role may hold it in seed
-- (RLS on public.tenants mutations remains is_system_admin() only).

insert into authz.permissions (key, description)
values (
  'tenants.manage',
  'Platform: create, update, and delete tenants (RLS uses is_system_admin only)'
)
on conflict (key) do update
set description = excluded.description;

delete from authz.role_permissions rp
using authz.permissions p
where rp.permission_id = p.id
  and p.key = 'tenants.manage';
