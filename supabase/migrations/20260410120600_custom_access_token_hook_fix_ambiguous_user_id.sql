-- Fix PL/pgSQL variable `user_id` shadowing table columns (SQLSTATE 42702).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  v_user_id uuid;
  session_id uuid;
  session_tenant_id uuid;
  membership record;
  assigned_role_slugs text[];
  active_role_slug text;
  is_admin boolean;
  is_locked boolean;
  is_revoked boolean;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  v_user_id := nullif(event ->> 'user_id', '')::uuid;
  session_id := nullif(claims ->> 'session_id', '')::uuid;

  select p.is_system_admin
  into is_admin
  from public.profiles p
  where p.id = v_user_id;

  select urs.is_locked
  into is_locked
  from private.user_risk_scores urs
  where urs.user_id = v_user_id;

  if session_id is not null then
    select s.tenant_id, s.is_revoked or s.expires_at <= now()
    into session_tenant_id, is_revoked
    from private.auth_sessions s
    where s.id = session_id;
  end if;

  claims := jsonb_set(claims, '{is_system_admin}', to_jsonb(coalesce(is_admin, false)), true);
  claims := jsonb_set(claims, '{sid}', to_jsonb(session_id), true);
  claims := jsonb_set(claims, '{session_revoked}', to_jsonb(coalesce(is_revoked, false)), true);
  claims := jsonb_set(claims, '{is_locked}', to_jsonb(coalesce(is_locked, false)), true);

  select
    tm.id,
    tm.tenant_id,
    tm.permission_version,
    tm.active_role_id
  into membership
  from public.tenant_members tm
  where tm.user_id = v_user_id
    and tm.status = 'active'
  order by
    case when tm.tenant_id = session_tenant_id then 0 else 1 end,
    tm.created_at asc
  limit 1;

  if membership.id is null then
    claims := jsonb_set(claims, '{tid}', 'null'::jsonb, true);
    claims := jsonb_set(claims, '{active_role}', 'null'::jsonb, true);
    claims := jsonb_set(claims, '{roles}', '[]'::jsonb, true);
    claims := jsonb_set(claims, '{pv}', '0'::jsonb, true);
    return jsonb_set(event, '{claims}', claims, true);
  end if;

  select coalesce(array_agg(r.slug order by r.name), '{}'::text[])
  into assigned_role_slugs
  from authz.tenant_member_roles tmr
  join authz.roles r on r.id = tmr.role_id
  where tmr.tenant_member_id = membership.id;

  if membership.active_role_id is null and cardinality(assigned_role_slugs) = 1 then
    select tmr.role_id
    into membership.active_role_id
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = membership.id
    limit 1;

    update public.tenant_members tm
    set active_role_id = membership.active_role_id
    where tm.id = membership.id;
  end if;

  if membership.active_role_id is not null then
    select r.slug
    into active_role_slug
    from authz.roles r
    where r.id = membership.active_role_id;
  end if;

  claims := jsonb_set(claims, '{tid}', to_jsonb(membership.tenant_id), true);
  claims := jsonb_set(claims, '{active_role}', to_jsonb(active_role_slug), true);
  claims := jsonb_set(claims, '{roles}', to_jsonb(assigned_role_slugs), true);
  claims := jsonb_set(claims, '{pv}', to_jsonb(membership.permission_version), true);

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;
