-- ==========================================================================
-- Migration: Session Management, Security Events, and Alerting
-- ==========================================================================
-- Contains:
--   1. Session lifecycle (bind, touch, refresh token rotation, cleanup)
--   2. Risk scoring (event → score → lock/revoke escalation)
--   3. Security event logging and alert creation triggers
--   4. pg_cron jobs (risk decay, session cleanup)
--   5. Public RPC wrappers (callable by service_role via PostgREST)
--
-- Key security invariants:
--   - bind_auth_session refuses to update revoked sessions
--   - handle_token_refresh detects replay and revokes all sessions
--   - apply_risk_event escalates: score>=20 → revoke, score>=30 → lock
--   - Risk scores decay by 1 point/hour via pg_cron
-- ==========================================================================

create or replace function private.log_security_event(
  p_event_type text,
  p_severity text,
  p_user_id uuid default null,
  p_tenant_id uuid default null,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_event_id uuid;
begin
  insert into private.security_events (
    user_id,
    tenant_id,
    event_type,
    severity,
    ip_address,
    metadata
  )
  values (
    p_user_id,
    p_tenant_id,
    p_event_type,
    p_severity,
    p_ip_address,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into new_event_id;

  return new_event_id;
end;
$$;

create or replace function private.revoke_user_sessions(
  p_user_id uuid,
  p_reason text default 'security_action'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  update private.auth_sessions
  set is_revoked = true,
      revoked_at = now(),
      revoke_reason = p_reason
  where user_id = p_user_id
    and is_revoked = false;

  get diagnostics affected_rows = row_count;

  if affected_rows > 0 then
    perform private.log_security_event(
      'all_sessions_revoked',
      'high',
      p_user_id,
      null,
      null,
      jsonb_build_object('reason', p_reason, 'affected_sessions', affected_rows)
    );
  end if;

  return affected_rows;
end;
$$;

-- Risk scoring: maps event types to point values and escalates.
-- Thresholds: >= 20 → revoke all sessions, >= 30 → lock account (24h).
-- Points per event: failed_login=2, rate_limit_hit=3, new_ip=5,
-- refresh_token_reuse=10 (critical — immediate near-lock).
create or replace function private.apply_risk_event(
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_type text,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  points integer := 0;
  new_score integer;
begin
  points := case p_event_type
    when 'failed_login' then 2
    when 'rate_limit_hit' then 3
    when 'permission_denied' then 2
    when 'new_ip' then 5
    when 'session_revoked' then 1
    when 'refresh_token_reuse' then 10
    else 0
  end;

  insert into private.user_risk_scores (
    user_id,
    score,
    updated_at,
    last_evaluated_at
  )
  values (p_user_id, points, now(), now())
  on conflict (user_id) do update
  set score = private.user_risk_scores.score + excluded.score,
      updated_at = now(),
      last_evaluated_at = now()
  returning score into new_score;

  if new_score >= 30 then
    update private.user_risk_scores
    set is_locked = true,
        locked_at = coalesce(locked_at, now()),
        lock_reason = p_event_type,
        locked_until = now() + interval '24 hours',
        updated_at = now()
    where user_id = p_user_id;

    perform private.log_security_event(
      'account_locked',
      'critical',
      p_user_id,
      p_tenant_id,
      p_ip_address,
      jsonb_build_object('reason', p_event_type, 'score', new_score)
    );
  elsif new_score >= 20 then
    perform private.revoke_user_sessions(p_user_id, 'risk_threshold');
  end if;

  perform private.log_security_event(
    p_event_type,
    case
      when points >= 10 then 'critical'
      when points >= 5 then 'high'
      when points >= 3 then 'medium'
      else 'low'
    end,
    p_user_id,
    p_tenant_id,
    p_ip_address,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('points', points, 'score', new_score)
  );

  return new_score;
end;
$$;

create or replace function private.bind_auth_session(
  p_session_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_refresh_token_hash text,
  p_expires_at timestamptz,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_device_fingerprint text default null
)
returns private.auth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  bound_session private.auth_sessions;
begin
  insert into private.auth_sessions (
    id,
    user_id,
    tenant_id,
    refresh_token_hash,
    ip_address,
    user_agent,
    device_fingerprint,
    last_active_at,
    expires_at
  )
  values (
    p_session_id,
    p_user_id,
    p_tenant_id,
    p_refresh_token_hash,
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    now(),
    p_expires_at
  )
  -- ON CONFLICT: only update non-revoked sessions. Revoked sessions
  -- cannot be rebound — this prevents a compromised session ID from
  -- being reactivated after a security revocation.
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      refresh_token_hash = excluded.refresh_token_hash,
      ip_address = excluded.ip_address,
      user_agent = excluded.user_agent,
      device_fingerprint = excluded.device_fingerprint,
      last_active_at = now(),
      expires_at = excluded.expires_at
  where private.auth_sessions.is_revoked = false
  returning * into bound_session;

  if bound_session.id is null then
    raise exception 'Session has been revoked and cannot be rebound'
      using errcode = 'check_violation';
  end if;

  return bound_session;
end;
$$;

create or replace function private.touch_auth_session(
  p_session_id uuid,
  p_tenant_id uuid default null
)
returns private.auth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched_session private.auth_sessions;
begin
  update private.auth_sessions
  set tenant_id = coalesce(p_tenant_id, tenant_id),
      last_active_at = now()
  where id = p_session_id
  returning * into touched_session;

  return touched_session;
end;
$$;

create or replace function private.handle_token_refresh(
  p_session_id uuid,
  p_incoming_token_hash text,
  p_new_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record private.auth_sessions;
begin
  select *
  into session_record
  from private.auth_sessions
  where id = p_session_id
    and is_revoked = false
    and expires_at > now();

  if session_record.id is null then
    return false;
  end if;

  if session_record.refresh_token_hash <> p_incoming_token_hash then
    perform private.revoke_user_sessions(session_record.user_id, 'refresh_token_reuse');
    perform private.apply_risk_event(
      session_record.user_id,
      session_record.tenant_id,
      'refresh_token_reuse',
      session_record.ip_address,
      jsonb_build_object('session_id', p_session_id)
    );
    return false;
  end if;

  update private.auth_sessions
  set refresh_token_hash = p_new_token_hash,
      refresh_token_seq = refresh_token_seq + 1,
      last_active_at = now()
  where id = p_session_id;

  return true;
end;
$$;

create or replace function private.cleanup_auth_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_rows integer;
begin
  delete from private.auth_sessions
  where (is_revoked = true or expires_at < now())
    and created_at < now() - interval '30 days';

  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

create or replace function private.decay_risk_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  update private.user_risk_scores
  set score = greatest(score - 1, 0),
      is_locked = case
        when locked_until is not null and locked_until < now() then false
        else is_locked
      end,
      updated_at = now(),
      last_evaluated_at = now()
  where score > 0
     or (is_locked and locked_until is not null and locked_until < now());

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;

create or replace function private.create_security_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.severity = 'critical' then
    insert into private.security_alerts (security_event_id, channel)
    values
      (new.id, 'email'),
      (new.id, 'slack'),
      (new.id, 'dashboard');
  elsif new.severity = 'high' then
    insert into private.security_alerts (security_event_id, channel)
    values
      (new.id, 'slack'),
      (new.id, 'dashboard');
  else
    insert into private.security_alerts (security_event_id, channel)
    values (new.id, 'dashboard');
  end if;

  return new;
end;
$$;

create or replace function private.notify_security_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.severity in ('critical', 'high') then
    perform pg_notify(
      'security_alerts',
      jsonb_build_object(
        'id', new.id,
        'event_type', new.event_type,
        'severity', new.severity,
        'user_id', new.user_id,
        'tenant_id', new.tenant_id,
        'ip_address', new.ip_address,
        'metadata', new.metadata,
        'created_at', new.created_at
      )::text
    );
  end if;

  return new;
end;
$$;

create or replace function private.acknowledge_security_alert(
  p_alert_id uuid,
  p_user_id uuid
)
returns private.security_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_alert private.security_alerts;
begin
  update private.security_alerts
  set status = 'acknowledged',
      acknowledged_at = now(),
      acknowledged_by = p_user_id
  where id = p_alert_id
  returning * into updated_alert;

  return updated_alert;
end;
$$;

drop trigger if exists on_security_event_create_alerts on private.security_events;
create trigger on_security_event_create_alerts
after insert on private.security_events
for each row execute function private.create_security_alerts();

drop trigger if exists on_security_event_notify on private.security_events;
create trigger on_security_event_notify
after insert on private.security_events
for each row execute function private.notify_security_alert();

-- Auto-create monthly partitions for security_events and audit_logs.
-- Creates the partition for next month if it doesn't exist yet.
-- Intended to run monthly via pg_cron (1st of each month at 00:00).
create or replace function private.create_monthly_partitions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_month_start date;
  next_month_end date;
  partition_suffix text;
  se_part text;
  al_part text;
begin
  next_month_start := date_trunc('month', now() + interval '1 month')::date;
  next_month_end := (next_month_start + interval '1 month')::date;
  partition_suffix := to_char(next_month_start, 'YYYY_MM');

  se_part := 'private.security_events_' || partition_suffix;
  al_part := 'private.audit_logs_' || partition_suffix;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname = 'security_events_' || partition_suffix
  ) then
    execute format(
      'create table %s partition of private.security_events for values from (%L) to (%L)',
      se_part, next_month_start, next_month_end
    );
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname = 'audit_logs_' || partition_suffix
  ) then
    execute format(
      'create table %s partition of private.audit_logs for values from (%L) to (%L)',
      al_part, next_month_start, next_month_end
    );
  end if;
end;
$$;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron unavailable in this environment, skipping scheduled jobs';
  end;

  if exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    if not exists (
      select 1
      from cron.job
      where jobname = 'auth-risk-score-decay'
    ) then
      perform cron.schedule(
        'auth-risk-score-decay',
        '0 * * * *',
        $job$select private.decay_risk_scores();$job$
      );
    end if;

    if not exists (
      select 1
      from cron.job
      where jobname = 'auth-session-cleanup'
    ) then
      perform cron.schedule(
        'auth-session-cleanup',
        '15 2 * * *',
        $job$select private.cleanup_auth_sessions();$job$
      );
    end if;

    if not exists (
      select 1
      from cron.job
      where jobname = 'create-monthly-partitions'
    ) then
      perform cron.schedule(
        'create-monthly-partitions',
        '0 0 1 * *',
        $job$select private.create_monthly_partitions();$job$
      );
    end if;
  end if;
end
$$;

-- DB-level permission check for Edge Functions that bypass RLS via service_role.
-- Single source of truth: resolves the user's active role in the given tenant
-- and checks if that role has the specified permission key.
create or replace function public.check_user_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active_role_id uuid;
begin
  select tm.active_role_id
  into v_active_role_id
  from public.tenant_members tm
  where tm.user_id = p_user_id
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  if v_active_role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from authz.role_permissions rp
    join authz.permissions perm on perm.id = rp.permission_id
    where rp.role_id = v_active_role_id
      and perm.key = p_permission_key
  );
end;
$$;

create or replace function public.log_security_event_service(
  p_event_type text,
  p_severity text,
  p_user_id uuid default null,
  p_tenant_id uuid default null,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.log_security_event(
    p_event_type,
    p_severity,
    p_user_id,
    p_tenant_id,
    p_ip_address,
    p_metadata
  );
$$;

create or replace function public.apply_risk_event_service(
  p_user_id uuid,
  p_tenant_id uuid,
  p_event_type text,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.apply_risk_event(
    p_user_id,
    p_tenant_id,
    p_event_type,
    p_ip_address,
    p_metadata
  );
$$;

create or replace function public.revoke_user_sessions_service(
  p_user_id uuid,
  p_reason text default 'security_action'
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.revoke_user_sessions(p_user_id, p_reason);
$$;

create or replace function public.touch_auth_session_service(
  p_session_id uuid,
  p_tenant_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select to_jsonb(private.touch_auth_session(p_session_id, p_tenant_id));
$$;

create or replace function public.bind_auth_session_service(
  p_session_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_refresh_token_hash text,
  p_expires_at timestamptz,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_device_fingerprint text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select to_jsonb(
    private.bind_auth_session(
      p_session_id,
      p_user_id,
      p_tenant_id,
      p_refresh_token_hash,
      p_expires_at,
      p_ip_address,
      p_user_agent,
      p_device_fingerprint
    )
  );
$$;

create or replace function public.handle_token_refresh_service(
  p_session_id uuid,
  p_incoming_token_hash text,
  p_new_token_hash text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.handle_token_refresh(
    p_session_id,
    p_incoming_token_hash,
    p_new_token_hash
  );
$$;

create or replace function public.sync_tenant_member_roles(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role_slugs text[],
  p_active_role_slug text default null,
  p_display_name text default null,
  p_avatar_url text default null
)
returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  desired_role_ids uuid[];
  resolved_active_role_id uuid;
begin
  if coalesce(array_length(p_role_slugs, 1), 0) = 0 then
    raise exception 'At least one role slug is required';
  end if;

  insert into public.tenant_members (
    tenant_id,
    user_id,
    display_name,
    avatar_url
  )
  values (
    p_tenant_id,
    p_user_id,
    p_display_name,
    p_avatar_url
  )
  on conflict (tenant_id, user_id) do update
  set display_name = coalesce(excluded.display_name, public.tenant_members.display_name),
      avatar_url = coalesce(excluded.avatar_url, public.tenant_members.avatar_url),
      status = 'active'
  returning * into member_row;

  select array_agg(r.id order by r.name)
  into desired_role_ids
  from authz.roles r
  where r.tenant_id = p_tenant_id
    and r.slug = any(p_role_slugs);

  if coalesce(array_length(desired_role_ids, 1), 0) <> array_length(p_role_slugs, 1) then
    raise exception 'One or more role slugs are invalid for the tenant';
  end if;

  delete from authz.tenant_member_roles tmr
  where tmr.tenant_member_id = member_row.id
    and not (tmr.role_id = any(desired_role_ids));

  insert into authz.tenant_member_roles (tenant_member_id, role_id)
  select member_row.id, desired_role_id
  from unnest(desired_role_ids) desired_role_id
  on conflict do nothing;

  if p_active_role_slug is not null then
    select r.id
    into resolved_active_role_id
    from authz.roles r
    where r.tenant_id = p_tenant_id
      and r.slug = p_active_role_slug;
  else
    resolved_active_role_id := desired_role_ids[1];
  end if;

  if resolved_active_role_id is null or not (resolved_active_role_id = any(desired_role_ids)) then
    raise exception 'Active role must be one of the assigned roles';
  end if;

  update public.tenant_members tm
  set active_role_id = resolved_active_role_id,
      updated_at = now()
  where tm.id = member_row.id
  returning * into member_row;

  return member_row;
end;
$$;

create or replace function public.switch_active_role(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role_slug text
)
returns public.tenant_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.tenant_members;
  role_id uuid;
begin
  select tm.*
  into member_row
  from public.tenant_members tm
  where tm.user_id = p_user_id
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  if member_row.id is null then
    raise exception 'Active tenant membership not found';
  end if;

  select r.id
  into role_id
  from authz.roles r
  join authz.tenant_member_roles tmr on tmr.role_id = r.id
  where r.tenant_id = p_tenant_id
    and r.slug = p_role_slug
    and tmr.tenant_member_id = member_row.id
  limit 1;

  if role_id is null then
    raise exception 'Role is not assigned to the member';
  end if;

  update public.tenant_members tm
  set active_role_id = role_id,
      updated_at = now()
  where tm.id = member_row.id
  returning * into member_row;

  return member_row;
end;
$$;

create or replace function public.get_pending_security_alerts(
  p_limit integer default 100
)
returns table (
  alert_id uuid,
  security_event_id uuid,
  channel text,
  status text,
  recipient text,
  event_type text,
  severity text,
  user_id uuid,
  tenant_id uuid,
  ip_address inet,
  metadata jsonb,
  event_at timestamptz,
  alert_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    sa.id,
    sa.security_event_id,
    sa.channel,
    sa.status,
    sa.recipient,
    se.event_type,
    se.severity,
    se.user_id,
    se.tenant_id,
    se.ip_address,
    se.metadata,
    se.created_at,
    sa.created_at
  from private.security_alerts sa
  join private.security_events se on se.id = sa.security_event_id
  where sa.status = 'pending'
  order by se.created_at asc
  limit greatest(coalesce(p_limit, 100), 1);
$$;

create or replace function public.mark_security_alert_status(
  p_alert_id uuid,
  p_status text,
  p_recipient text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_alert private.security_alerts;
begin
  update private.security_alerts sa
  set status = p_status,
      recipient = coalesce(p_recipient, sa.recipient),
      sent_at = case when p_status = 'sent' then now() else sa.sent_at end
  where sa.id = p_alert_id
  returning * into updated_alert;

  return to_jsonb(updated_alert);
end;
$$;

grant execute on function private.log_security_event(text, text, uuid, uuid, inet, jsonb) to service_role;
grant execute on function private.revoke_user_sessions(uuid, text) to service_role;
grant execute on function private.apply_risk_event(uuid, uuid, text, inet, jsonb) to service_role;
grant execute on function private.bind_auth_session(uuid, uuid, uuid, text, timestamptz, inet, text, text) to service_role;
grant execute on function private.touch_auth_session(uuid, uuid) to service_role;
grant execute on function private.handle_token_refresh(uuid, text, text) to service_role;
grant execute on function private.cleanup_auth_sessions() to service_role;
grant execute on function private.decay_risk_scores() to service_role;
grant execute on function private.acknowledge_security_alert(uuid, uuid) to service_role;
grant execute on function private.create_monthly_partitions() to service_role;

grant execute on function public.log_security_event_service(text, text, uuid, uuid, inet, jsonb) to service_role;
grant execute on function public.apply_risk_event_service(uuid, uuid, text, inet, jsonb) to service_role;
grant execute on function public.revoke_user_sessions_service(uuid, text) to service_role;
grant execute on function public.touch_auth_session_service(uuid, uuid) to service_role;
grant execute on function public.bind_auth_session_service(uuid, uuid, uuid, text, timestamptz, inet, text, text) to service_role;
grant execute on function public.handle_token_refresh_service(uuid, text, text) to service_role;
grant execute on function public.sync_tenant_member_roles(uuid, uuid, text[], text, text, text) to service_role;
grant execute on function public.switch_active_role(uuid, uuid, text) to service_role;
grant execute on function public.check_user_permission(uuid, uuid, text) to service_role;
grant execute on function public.get_pending_security_alerts(integer) to service_role;
grant execute on function public.mark_security_alert_status(uuid, text, text) to service_role;
