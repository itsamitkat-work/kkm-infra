-- Default permission sets per role template. handle_new_tenant() copies these into
-- authz.tenant_role_permissions for each new tenant's tenant_roles (by template_key).

begin;

create table if not exists authz.role_template_permissions (
  template_key text not null
    references authz.role_templates (key)
    on update cascade
    on delete cascade,
  permission_id uuid not null
    references authz.permissions (id)
    on update cascade
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_key, permission_id)
);

create index if not exists idx_role_template_permissions_permission_id
  on authz.role_template_permissions (permission_id);

revoke all on table authz.role_template_permissions from authenticated;
revoke all on table authz.role_template_permissions from anon;

drop trigger if exists audit_role_template_permissions on authz.role_template_permissions;
create trigger audit_role_template_permissions
after insert or update or delete on authz.role_template_permissions
for each row execute function private.capture_audit_log();

-- Rows in role_template_permissions are seeded in supabase/seed/auth_authz_seed.sql
-- (after role_templates + permissions, before tenants) so handle_new_tenant can copy them.

create or replace function public.handle_new_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sr record;
begin
  for sr in
    select key, name
    from authz.role_templates
    order by name
  loop
    insert into authz.tenant_roles (tenant_id, name, slug, template_key, is_system)
    values (new.id, sr.name, sr.key, sr.key, true)
    on conflict (tenant_id, slug) do nothing;
  end loop;

  insert into authz.tenant_role_permissions (tenant_role_id, permission_id)
  select tr.id, rtp.permission_id
  from authz.tenant_roles tr
  join authz.role_template_permissions rtp
    on rtp.template_key = tr.template_key
  where tr.tenant_id = new.id
    and tr.template_key is not null
  on conflict (tenant_role_id, permission_id) do nothing;

  return new;
end;
$$;

commit;
