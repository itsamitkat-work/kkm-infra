-- Merge clients.create/update/delete -> clients.manage and
-- projects.create/update/delete -> projects.manage (authz + RLS helpers).

insert into authz.permissions (key, description)
values
  ('clients.manage', 'Create, update, and delete clients'),
  ('projects.manage', 'Create, update, and delete projects')
on conflict (key) do update
set description = excluded.description;

insert into authz.role_permissions (role_id, permission_id)
select distinct rp.role_id, p_new.id
from authz.role_permissions rp
join authz.permissions p_old on p_old.id = rp.permission_id
cross join lateral (
  select id from authz.permissions where key = 'clients.manage' limit 1
) p_new
where p_old.key in ('clients.create', 'clients.update', 'clients.delete')
on conflict (role_id, permission_id) do nothing;

insert into authz.role_permissions (role_id, permission_id)
select distinct rp.role_id, p_new.id
from authz.role_permissions rp
join authz.permissions p_old on p_old.id = rp.permission_id
cross join lateral (
  select id from authz.permissions where key = 'projects.manage' limit 1
) p_new
where p_old.key in ('projects.create', 'projects.update', 'projects.delete')
on conflict (role_id, permission_id) do nothing;

delete from authz.role_permissions rp
using authz.permissions p
where rp.permission_id = p.id
  and p.key in (
    'clients.create',
    'clients.update',
    'clients.delete',
    'projects.create',
    'projects.update',
    'projects.delete'
  );

delete from authz.permissions
where key in (
  'clients.create',
  'clients.update',
  'clients.delete',
  'projects.create',
  'projects.update',
  'projects.delete'
);

create or replace function public.client_policy_ok(p_client_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public, authz
as $$
  select
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and p_client_id is not null
    and exists (
      select 1
      from public.clients c
      where c.id = p_client_id
        and (
          (select authz.is_system_admin())
          or (
            c.tenant_id = (select authz.current_tenant_id())
            and (
              (p_action = 'read' and (select authz.has_permission('clients.read')))
              or (
                p_action in ('create', 'update', 'delete')
                and (select authz.has_permission('clients.manage'))
              )
            )
          )
        )
    );
$$;

create or replace function public.project_policy_ok(p_project_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public, authz
as $$
  select
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and p_project_id is not null
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and (
          (select authz.is_system_admin())
          or (
            p.tenant_id = (select authz.current_tenant_id())
            and (
              (p_action = 'read' and (select authz.has_permission('projects.read')))
              or (
                p_action in ('create', 'update', 'delete')
                and (select authz.has_permission('projects.manage'))
              )
            )
          )
        )
    );
$$;

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('clients.manage'))
      )
    )
  );

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    (select authz.is_session_valid())
    and not (select authz.is_account_locked())
    and (select authz.check_permission_version())
    and (
      (select authz.is_system_admin())
      or (
        tenant_id = (select authz.current_tenant_id())
        and (select authz.has_permission('projects.manage'))
      )
    )
  );
