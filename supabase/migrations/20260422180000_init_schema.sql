


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "authz";


ALTER SCHEMA "authz" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "tests";


ALTER SCHEMA "tests" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "ltree" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgtap" WITH SCHEMA "tests";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."record_status" AS ENUM (
    'active',
    'inactive',
    'deprecated'
);


ALTER TYPE "public"."record_status" OWNER TO "postgres";


CREATE TYPE "public"."schedule_annotation_type" AS ENUM (
    'note',
    'remark',
    'condition',
    'reference'
);


ALTER TYPE "public"."schedule_annotation_type" OWNER TO "postgres";


CREATE TYPE "public"."schedule_node_type" AS ENUM (
    'section',
    'group',
    'item'
);


ALTER TYPE "public"."schedule_node_type" OWNER TO "postgres";


CREATE TYPE "public"."schedule_source_type" AS ENUM (
    'govt',
    'private'
);


ALTER TYPE "public"."schedule_source_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."bump_permission_version"("p_tenant_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.tenant_members
  set permission_version = permission_version + 1,
      updated_at = now()
  where id = p_tenant_member_id;
end;
$$;


ALTER FUNCTION "authz"."bump_permission_version"("p_tenant_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."check_permission_version"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_tid uuid := (select authz.current_tenant_id());
  jwt_pv integer;
  db_pv integer;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  jwt_pv := coalesce(((select auth.jwt()) ->> 'pv')::integer, 0);

  select tm.permission_version
  into db_pv
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = v_tid
    and tm.status = 'active'
  limit 1;

  return jwt_pv >= coalesce(db_pv, 0);
end;
$$;


ALTER FUNCTION "authz"."check_permission_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."check_permission_version_for_tenant"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
declare
  v_uid uuid := (select auth.uid());
  jwt_pv integer;
  db_pv integer;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  if p_tenant_id is null then
    return false;
  end if;

  jwt_pv := coalesce(((select auth.jwt()) ->> 'pv')::integer, 0);

  select tm.permission_version
  into db_pv
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
  limit 1;

  return jwt_pv >= coalesce(db_pv, 0);
end;
$$;


ALTER FUNCTION "authz"."check_permission_version_for_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."current_active_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select nullif((select auth.jwt()) ->> 'active_role', '');
$$;


ALTER FUNCTION "authz"."current_active_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."current_session_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select nullif((select auth.jwt()) ->> 'sid', '')::uuid;
$$;


ALTER FUNCTION "authz"."current_session_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select nullif((select auth.jwt()) ->> 'tid', '')::uuid;
$$;


ALTER FUNCTION "authz"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."default_platform_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (
      select t.id
      from public.tenants t
      where coalesce((t.settings ->> 'platform_default')::boolean, false)
      order by t.created_at asc
      limit 1
    ),
    (
      select t.id
      from public.tenants t
      order by t.created_at asc
      limit 1
    )
  );
$$;


ALTER FUNCTION "authz"."default_platform_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."has_permission"("p" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_tid uuid := (select authz.current_tenant_id());
  v_active_role_id uuid;
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  select tm.active_role_id
  into v_active_role_id
  from public.tenant_members tm
  where tm.user_id = v_uid
    and tm.tenant_id = v_tid
    and tm.status = 'active'
  limit 1;

  if v_active_role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from authz.tenant_role_permissions trp
    join authz.permissions perm on perm.id = trp.permission_id
    where trp.tenant_role_id = v_active_role_id
      and perm.key = p
  );
end;
$$;


ALTER FUNCTION "authz"."has_permission"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."has_permission_for_tenant"("p_tenant_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if (select authz.is_system_admin()) then
    return true;
  end if;

  if p_tenant_id is null or p_permission is null or length(trim(p_permission)) = 0 then
    return false;
  end if;

  if v_uid is null then
    return false;
  end if;

  return exists (
    select 1
    from public.tenant_members tm
    join authz.tenant_member_roles tmr on tmr.tenant_member_id = tm.id
    join authz.tenant_role_permissions trp on trp.tenant_role_id = tmr.tenant_role_id
    join authz.permissions perm on perm.id = trp.permission_id
    where tm.user_id = v_uid
      and tm.tenant_id = p_tenant_id
      and tm.status = 'active'
      and perm.key = p_permission
  );
end;
$$;


ALTER FUNCTION "authz"."has_permission_for_tenant"("p_tenant_id" "uuid", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."is_account_locked"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(((select auth.jwt()) ->> 'is_locked')::boolean, false);
$$;


ALTER FUNCTION "authz"."is_account_locked"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."is_session_valid"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(((select auth.jwt()) ->> 'session_revoked')::boolean, false) = false;
$$;


ALTER FUNCTION "authz"."is_session_valid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."is_system_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(((select auth.jwt()) ->> 'is_system_admin')::boolean, false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_system_admin
    );
$$;


ALTER FUNCTION "authz"."is_system_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."on_member_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform authz.bump_permission_version(coalesce(new.tenant_member_id, old.tenant_member_id));
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "authz"."on_member_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "authz"."on_role_permission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  changed_role_id uuid;
begin
  changed_role_id := coalesce(new.tenant_role_id, old.tenant_role_id);

  update public.tenant_members tm
  set permission_version = tm.permission_version + 1,
      updated_at = now()
  where exists (
    select 1
    from authz.tenant_member_roles tmr
    where tmr.tenant_member_id = tm.id
      and tmr.tenant_role_id = changed_role_id
  );

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "authz"."on_role_permission_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."security_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "security_event_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "recipient" "text",
    "sent_at" timestamp with time zone,
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_alerts_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'slack'::"text", 'dashboard'::"text"]))),
    CONSTRAINT "security_alerts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'acknowledged'::"text"])))
);


ALTER TABLE "private"."security_alerts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."acknowledge_security_alert"("p_alert_id" "uuid", "p_user_id" "uuid") RETURNS "private"."security_alerts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."acknowledge_security_alert"("p_alert_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."apply_risk_event"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."apply_risk_event"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."auth_sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "refresh_token_hash" "text" NOT NULL,
    "refresh_token_seq" integer DEFAULT 0 NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "device_fingerprint" "text",
    "is_revoked" boolean DEFAULT false NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoke_reason" "text",
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "private"."auth_sessions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."bind_auth_session"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_device_fingerprint" "text" DEFAULT NULL::"text") RETURNS "private"."auth_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."bind_auth_session"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."capture_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  jwt_claims jsonb;
begin
  jwt_claims := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb;

  insert into private.audit_logs (
    user_id,
    tenant_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data,
    ip_address
  )
  values (
    nullif(jwt_claims ->> 'sub', '')::uuid,
    nullif(jwt_claims ->> 'tid', '')::uuid,
    lower(tg_op),
    tg_table_schema || '.' || tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    nullif(jwt_claims ->> 'ip_address', '')::inet
  );

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "private"."capture_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cleanup_auth_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."cleanup_auth_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_monthly_partitions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."create_monthly_partitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_security_alerts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."create_security_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."decay_risk_scores"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."decay_risk_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_token_refresh"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."handle_token_refresh"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_security_alert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."notify_security_alert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."revoke_user_sessions"("p_user_id" "uuid", "p_reason" "text" DEFAULT 'security_action'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."revoke_user_sessions"("p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_auth_session"("p_session_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "private"."auth_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."touch_auth_session"("p_session_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_risk_event_service"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.apply_risk_event(
    p_user_id,
    p_tenant_id,
    p_event_type,
    p_ip_address,
    p_metadata
  );
$$;


ALTER FUNCTION "public"."apply_risk_event_service"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bind_auth_session_service"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_device_fingerprint" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."bind_auth_session_service"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    from authz.tenant_role_permissions trp
    join authz.permissions perm on perm.id = trp.permission_id
    where trp.tenant_role_id = v_active_role_id
      and perm.key = p_permission_key
  );
end;
$$;


ALTER FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_policy_ok"("p_client_id" "uuid", "p_action" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
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


ALTER FUNCTION "public"."client_policy_ok"("p_client_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_schedules_clear_other_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.is_default then
    update public.client_schedules
    set is_default = false, updated_at = now()
    where client_id = new.client_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."client_schedules_clear_other_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clients_set_tenant_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
declare
  v_tid uuid;
  v_default uuid;
begin
  if (select authz.is_system_admin()) then
    v_default := (select authz.default_platform_tenant_id());
    if v_default is null then
      raise exception 'no tenants exist; cannot assign default tenant for client';
    end if;
    new.tenant_id := v_default;
    return new;
  end if;

  v_tid := (select authz.current_tenant_id());
  if v_tid is null then
    raise exception 'tenant context required to create a client';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;


ALTER FUNCTION "public"."clients_set_tenant_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_schedule_item_path"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  parent_path ltree;
  short_id text;
begin
  short_id := public.uuid_to_short_id(new.id);

  if new.slug is null or new.slug = '' then
    new.slug := regexp_replace(lower(new.code), '[^a-z0-9]+', '_', 'g');
    new.slug := trim(both '_' from new.slug);
  end if;

  if new.parent_item_id is null then
    new.path := text2ltree(short_id);
  else
    select si.path into parent_path
    from public.schedule_items si
    where si.id = new.parent_item_id;

    if parent_path is null then
      raise exception 'Parent item % not found', new.parent_item_id;
    end if;

    new.path := parent_path || text2ltree(short_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."compute_schedule_item_path"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'on_hold'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid" DEFAULT NULL::"uuid", "p_members_by_slug" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_tid uuid;
  v_default uuid;
  new_project public.projects%rowtype;
  r_slug text;
  r_user_id text;
  v_role_id uuid;
  v_diag int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not (select authz.is_session_valid()) or (select authz.is_account_locked()) then
    raise exception 'session not allowed';
  end if;

  if (select authz.is_system_admin()) then
    v_default := (select authz.default_platform_tenant_id());
    if v_default is null then
      raise exception 'no tenants for default platform';
    end if;
    v_tid := v_default;
  else
    v_tid := (select authz.current_tenant_id());
    if v_tid is null then
      raise exception 'tenant context required';
    end if;
    if not (select authz.has_permission_for_tenant(v_tid, 'projects.manage')) then
      raise exception 'projects.manage required';
    end if;
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;

  if p_status is null or length(trim(p_status)) = 0 then
    raise exception 'status required';
  end if;

  if p_schedule_source_id is not null then
    if not exists (select 1 from public.schedule_sources ss where ss.id = p_schedule_source_id) then
      raise exception 'invalid schedule_source_id';
    end if;
  end if;

  insert into public.projects (name, code, status, meta, tenant_id)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_code, '')), ''),
    p_status,
    coalesce(p_meta, '{}'::jsonb),
    v_tid
  )
  returning * into new_project;

  if p_schedule_source_id is not null then
    if not exists (
      select 1
      from public.project_schedules ps
      where ps.project_id = new_project.id
        and ps.schedule_source_id = p_schedule_source_id
    ) then
      insert into public.project_schedules (project_id, schedule_source_id, is_default, is_active)
      values (new_project.id, p_schedule_source_id, false, true);
    end if;

    update public.project_schedules
    set is_default = false
    where project_id = new_project.id;

    update public.project_schedules
    set is_default = true
    where project_id = new_project.id
      and schedule_source_id = p_schedule_source_id;

    get diagnostics v_diag = row_count;
    if v_diag = 0 then
      raise exception 'schedule link missing';
    end if;
  end if;

  for r_slug, r_user_id in
    select key, value
    from jsonb_each_text(coalesce(p_members_by_slug, '{}'::jsonb))
  loop
    if r_user_id is null or length(trim(r_user_id)) = 0 then
      continue;
    end if;

    select tr.id
    into v_role_id
    from authz.tenant_roles tr
    where tr.tenant_id = v_tid
      and tr.slug = r_slug
    limit 1;

    if v_role_id is null and r_slug in ('supervisor', 'superviser') then
      select tr.id
      into v_role_id
      from authz.tenant_roles tr
      where tr.tenant_id = v_tid
        and tr.slug in ('supervisor', 'superviser')
      order by case tr.slug when r_slug then 0 else 1 end, tr.slug
      limit 1;
    end if;

    if v_role_id is null then
      raise exception 'unknown role slug % for tenant', r_slug;
    end if;

    if not exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = v_tid
        and tm.user_id = r_user_id::uuid
        and tm.status = 'active'
    ) then
      raise exception 'user % is not an active tenant member', r_user_id;
    end if;

    insert into public.project_members (project_id, user_id, role_id)
    values (new_project.id, r_user_id::uuid, v_role_id)
    on conflict (project_id, user_id, role_id) do nothing;
  end loop;

  return new_project;
end;
$$;


ALTER FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid", "p_members_by_slug" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  claims := jsonb_set(claims, '{sid}', coalesce(to_jsonb(session_id), 'null'::jsonb), true);
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
  join authz.tenant_roles r on r.id = tmr.tenant_role_id
  where tmr.tenant_member_id = membership.id;

  if membership.active_role_id is null and cardinality(assigned_role_slugs) = 1 then
    select tmr.tenant_role_id
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
    from authz.tenant_roles r
    where r.id = membership.active_role_id;
  end if;

  claims := jsonb_set(claims, '{tid}', coalesce(to_jsonb(membership.tenant_id), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{active_role}', coalesce(to_jsonb(active_role_slug), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{roles}', coalesce(to_jsonb(assigned_role_slugs), '[]'::jsonb), true);
  claims := jsonb_set(claims, '{pv}', coalesce(to_jsonb(membership.permission_version), '0'::jsonb), true);

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_platform_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
  select authz.default_platform_tenant_id();
$$;


ALTER FUNCTION "public"."default_platform_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_basic_rate_distinct_units"() RETURNS SETOF "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select distinct br.unit
  from public.basic_rates br
  order by 1;
$$;


ALTER FUNCTION "public"."get_basic_rate_distinct_units"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_basic_rate_distinct_units"() IS 'Returns distinct unit strings visible to the caller under basic_rates RLS.';



CREATE OR REPLACE FUNCTION "public"."get_pending_security_alerts"("p_limit" integer DEFAULT 100) RETURNS TABLE("alert_id" "uuid", "security_event_id" "uuid", "channel" "text", "status" "text", "recipient" "text", "event_type" "text", "severity" "text", "user_id" "uuid", "tenant_id" "uuid", "ip_address" "inet", "metadata" "jsonb", "event_at" timestamp with time zone, "alert_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."get_pending_security_alerts"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") RETURNS TABLE("id" "uuid", "parent_item_id" "uuid", "code" "text", "description" "text", "node_type" "public"."schedule_node_type", "depth" integer, "order_index" integer, "path_slug" "text", "rate" numeric, "unit_symbol" "text", "has_children" boolean, "annotations" "jsonb", "rates" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select
    si.id,
    si.parent_item_id,
    si.code,
    si.description,
    si.node_type,
    public.nlevel(si.path) as depth,
    si.order_index,
    public.schedule_item_path_slug(si.id) as path_slug,
    si.rate,
    u.symbol as unit_symbol,
    exists (
      select 1
      from public.schedule_items child
      where child.parent_item_id = si.id
        and child.schedule_source_version_id = si.schedule_source_version_id
    ) as has_children,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'type', a.type,
            'raw_text', a.raw_text,
            'order_index', a.order_index,
            'metadata', a.metadata
          )
          order by a.order_index nulls last, a.created_at
        )
        from public.schedule_item_annotations a
        where a.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as annotations,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'context', r.context,
            'label', r.label,
            'rate', r.rate,
            'rate_display', r.rate_display,
            'order_index', r.order_index
          )
          order by r.order_index nulls last, r.context
        )
        from public.schedule_item_rates r
        where r.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as rates
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  where si.schedule_source_version_id = p_schedule_source_version_id
    and si.parent_item_id = p_parent_item_id
  order by
    public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
    public.schedule_item_path_slug(si.id);
$$;


ALTER FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") RETURNS TABLE("id" "uuid", "parent_item_id" "uuid", "code" "text", "description" "text", "node_type" "public"."schedule_node_type", "depth" integer, "order_index" integer, "path_slug" "text", "rate" numeric, "unit_symbol" "text", "has_children" boolean, "annotations" "jsonb", "rates" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select
    si.id,
    si.parent_item_id,
    si.code,
    si.description,
    si.node_type,
    public.nlevel(si.path) as depth,
    si.order_index,
    public.schedule_item_path_slug(si.id) as path_slug,
    si.rate,
    u.symbol as unit_symbol,
    exists (
      select 1
      from public.schedule_items child
      where child.parent_item_id = si.id
        and child.schedule_source_version_id = si.schedule_source_version_id
    ) as has_children,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'type', a.type,
            'raw_text', a.raw_text,
            'order_index', a.order_index,
            'metadata', a.metadata
          )
          order by a.order_index nulls last, a.created_at
        )
        from public.schedule_item_annotations a
        where a.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as annotations,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'context', r.context,
            'label', r.label,
            'rate', r.rate,
            'rate_display', r.rate_display,
            'order_index', r.order_index
          )
          order by r.order_index nulls last, r.context
        )
        from public.schedule_item_rates r
        where r.schedule_item_id = si.id
      ),
      '[]'::jsonb
    ) as rates
  from public.schedule_items si
  left join public.units u on u.id = si.unit_id
  where si.schedule_source_version_id = p_schedule_source_version_id
    and si.parent_item_id is null
  order by
    public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
    public.schedule_item_path_slug(si.id);
$$;


ALTER FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."handle_new_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_token_refresh_service"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.handle_token_refresh(
    p_session_id,
    p_incoming_token_hash,
    p_new_token_hash
  );
$$;


ALTER FUNCTION "public"."handle_token_refresh_service"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_clients"("p_search" "text" DEFAULT NULL::"text", "p_status" "text"[] DEFAULT NULL::"text"[], "p_sort_by" "text" DEFAULT 'created_at'::"text", "p_sort_dir" "text" DEFAULT 'desc'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "display_name" "text", "full_name" "text", "gstin" "text", "addresses" "jsonb", "contacts" "jsonb", "status" "text", "meta" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_count" bigint, "default_schedule_source_id" "uuid", "default_schedule_display_name" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'authz'
    AS $_$
declare
  v_status text[];
  v_sort_by text;
  v_sort_dir text;
  v_order_clause text;
begin
  v_status := case
    when p_status is null or coalesce(cardinality(p_status), 0) = 0 then array['active']::text[]
    else p_status
  end;

  v_sort_by := lower(coalesce(p_sort_by, 'created_at'));
  if v_sort_by not in ('created_at', 'updated_at', 'display_name', 'status') then
    v_sort_by := 'created_at';
  end if;

  v_sort_dir := lower(coalesce(p_sort_dir, 'desc'));
  if v_sort_dir not in ('asc', 'desc') then
    v_sort_dir := 'desc';
  end if;

  v_order_clause := case v_sort_by
    when 'display_name' then format('b.display_name %s', v_sort_dir)
    when 'status' then format('b.status %s', v_sort_dir)
    when 'updated_at' then format('b.updated_at %s', v_sort_dir)
    else format('b.created_at %s', v_sort_dir)
  end;

  return query execute format($sql$
    with base as (
      select c.*
      from public.clients c
      where
        (
          $1::text is null
          or length(trim($1::text)) = 0
          or c.display_name ilike '%%' || trim($1::text) || '%%'
          or (c.full_name is not null and c.full_name ilike '%%' || trim($1::text) || '%%')
          or (c.gstin is not null and c.gstin ilike '%%' || trim($1::text) || '%%')
        )
        and c.status = any ($2::text[])
    ),
    sliced as (
      select
        b.*,
        (select count(*)::bigint from base) as total_count
      from base b
      order by %s
      limit $3::int offset $4::int
    )
    select
      s.id,
      s.tenant_id,
      s.display_name,
      s.full_name,
      s.gstin,
      s.addresses,
      s.contacts,
      s.status,
      s.meta,
      s.created_at,
      s.updated_at,
      s.total_count,
      cs.schedule_source_id as default_schedule_source_id,
      ss.display_name as default_schedule_display_name
    from sliced s
    left join lateral (
      select cs0.schedule_source_id
      from public.client_schedules cs0
      where cs0.client_id = s.id
        and cs0.is_default
        and cs0.is_active
      limit 1
    ) cs on true
    left join public.schedule_sources ss on ss.id = cs.schedule_source_id
  $sql$, v_order_clause)
  using
    p_search,
    v_status,
    p_limit,
    p_offset;
end;
$_$;


ALTER FUNCTION "public"."list_clients"("p_search" "text", "p_status" "text"[], "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_my_switchable_tenants"() RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "tenant_slug" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    tm.tenant_id,
    coalesce(t.display_name, t.name) as tenant_name,
    t.slug as tenant_slug
  from public.tenant_members tm
  join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = (select auth.uid())
    and tm.status = 'active'
    and (select authz.is_session_valid())
    and not (select authz.is_account_locked());
$$;


ALTER FUNCTION "public"."list_my_switchable_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_projects"("p_search" "text" DEFAULT NULL::"text", "p_status" "text"[] DEFAULT NULL::"text"[], "p_dos_from" "date" DEFAULT NULL::"date", "p_dos_to" "date" DEFAULT NULL::"date", "p_doc_from" "date" DEFAULT NULL::"date", "p_doc_to" "date" DEFAULT NULL::"date", "p_amount_min" numeric DEFAULT NULL::numeric, "p_amount_max" numeric DEFAULT NULL::numeric, "p_sort_by" "text" DEFAULT 'created_at'::"text", "p_sort_dir" "text" DEFAULT 'desc'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "name" "text", "code" "text", "status" "text", "meta" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_count" bigint, "default_schedule_source_id" "uuid", "default_schedule_display_name" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'authz'
    AS $_$
declare
  v_status text[];
  v_sort_by text;
  v_sort_dir text;
  v_order_clause text;
begin
  v_status := case
    when p_status is null or coalesce(cardinality(p_status), 0) = 0 then array['active']::text[]
    else p_status
  end;

  v_sort_by := lower(coalesce(p_sort_by, 'created_at'));
  if v_sort_by not in (
    'created_at', 'updated_at', 'name', 'code', 'status',
    'sanctionamount', 'sanctiondos', 'sanctiondoc', 'projectlocation'
  ) then
    v_sort_by := 'created_at';
  end if;

  v_sort_dir := lower(coalesce(p_sort_dir, 'desc'));
  if v_sort_dir not in ('asc', 'desc') then
    v_sort_dir := 'desc';
  end if;

  v_order_clause := case v_sort_by
    when 'name' then format('b.name %s', v_sort_dir)
    when 'code' then format('b.code %s nulls last', v_sort_dir)
    when 'status' then format('b.status %s', v_sort_dir)
    when 'updated_at' then format('b.updated_at %s', v_sort_dir)
    when 'sanctionamount' then format(
      '(nullif(b.meta->>''sanction_amount'',''''))::numeric %s nulls last',
      v_sort_dir
    )
    when 'sanctiondos' then format(
      '(nullif(b.meta->>''sanction_dos'',''''))::date %s nulls last',
      v_sort_dir
    )
    when 'sanctiondoc' then format(
      '(nullif(b.meta->>''sanction_doc'',''''))::date %s nulls last',
      v_sort_dir
    )
    when 'projectlocation' then format(
      'lower(coalesce(b.meta->>''location'','''')) %s nulls last',
      v_sort_dir
    )
    else format('b.created_at %s', v_sort_dir)
  end;

  return query execute format($sql$
    with base as (
      select p.*
      from public.projects p
      where
        (
          $1::text is null
          or length(trim($1::text)) = 0
          or p.name ilike '%%' || trim($1::text) || '%%'
          or (p.code is not null and p.code ilike '%%' || trim($1::text) || '%%')
        )
        and p.status = any ($2::text[])
        and (
          $3::date is null
          or (
            nullif(p.meta->>'sanction_dos', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_dos', ''))::date >= $3::date
          )
        )
        and (
          $4::date is null
          or (
            nullif(p.meta->>'sanction_dos', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_dos', ''))::date <= $4::date
          )
        )
        and (
          $5::date is null
          or (
            nullif(p.meta->>'sanction_doc', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_doc', ''))::date >= $5::date
          )
        )
        and (
          $6::date is null
          or (
            nullif(p.meta->>'sanction_doc', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            and (nullif(p.meta->>'sanction_doc', ''))::date <= $6::date
          )
        )
        and (
          $7::numeric is null
          or coalesce((nullif(p.meta->>'sanction_amount', ''))::numeric, 0) >= $7::numeric
        )
        and (
          $8::numeric is null
          or coalesce((nullif(p.meta->>'sanction_amount', ''))::numeric, 0) <= $8::numeric
        )
    ),
    sliced as (
      select
        b.*,
        (select count(*)::bigint from base) as total_count
      from base b
      order by %s
      limit $9::int offset $10::int
    )
    select
      s.id,
      s.tenant_id,
      s.name,
      s.code,
      s.status,
      s.meta,
      s.created_at,
      s.updated_at,
      s.total_count,
      ps.schedule_source_id as default_schedule_source_id,
      ss.display_name as default_schedule_display_name
    from sliced s
    left join lateral (
      select ps0.schedule_source_id
      from public.project_schedules ps0
      where ps0.project_id = s.id
        and ps0.is_default
        and ps0.is_active
      limit 1
    ) ps on true
    left join public.schedule_sources ss on ss.id = ps.schedule_source_id
  $sql$, v_order_clause)
  using
    p_search,
    v_status,
    p_dos_from,
    p_dos_to,
    p_doc_from,
    p_doc_to,
    p_amount_min,
    p_amount_max,
    p_limit,
    p_offset;
end;
$_$;


ALTER FUNCTION "public"."list_projects"("p_search" "text", "p_status" "text"[], "p_dos_from" "date", "p_dos_to" "date", "p_doc_from" "date", "p_doc_to" "date", "p_amount_min" numeric, "p_amount_max" numeric, "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event_service"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.log_security_event(
    p_event_type,
    p_severity,
    p_user_id,
    p_tenant_id,
    p_ip_address,
    p_metadata
  );
$$;


ALTER FUNCTION "public"."log_security_event_service"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_security_alert_status"("p_alert_id" "uuid", "p_status" "text", "p_recipient" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."mark_security_alert_status"("p_alert_id" "uuid", "p_status" "text", "p_recipient" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."project_members_enforce_role_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
begin
  if not exists (
    select 1
    from public.projects p
    join authz.tenant_roles r on r.id = new.role_id
    where p.id = new.project_id
      and r.tenant_id = p.tenant_id
  ) then
    raise exception 'role_id must belong to the same tenant as the project';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."project_members_enforce_role_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."project_policy_ok"("p_project_id" "uuid", "p_action" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
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


ALTER FUNCTION "public"."project_policy_ok"("p_project_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."project_schedules_clear_other_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.is_default then
    update public.project_schedules
    set is_default = false, updated_at = now()
    where project_id = new.project_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."project_schedules_clear_other_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."projects_set_tenant_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'authz'
    AS $$
declare
  v_tid uuid;
  v_default uuid;
begin
  if (select authz.is_system_admin()) then
    v_default := (select authz.default_platform_tenant_id());
    if v_default is null then
      raise exception 'no tenants exist; cannot assign default tenant for project';
    end if;
    new.tenant_id := v_default;
    return new;
  end if;

  v_tid := (select authz.current_tenant_id());
  if v_tid is null then
    raise exception 'tenant context required to create a project';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;


ALTER FUNCTION "public"."projects_set_tenant_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_system_admin_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  caller_is_admin boolean;
begin
  if new.is_system_admin is distinct from old.is_system_admin then
    if coalesce((auth.jwt()->>'role'), '') = 'service_role' then
      return new;
    end if;

    caller_is_admin := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'is_system_admin')::boolean,
      false
    );

    if not caller_is_admin then
      raise exception 'Only system admins can modify is_system_admin'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."protect_system_admin_flag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_user_sessions_service"("p_user_id" "uuid", "p_reason" "text" DEFAULT 'security_action'::"text") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.revoke_user_sessions(p_user_id, p_reason);
$$;


ALTER FUNCTION "public"."revoke_user_sessions_service"("p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  with recursive chain as (
    select
      si.id,
      si.parent_item_id,
      si.slug,
      0 as depth_from_item
    from public.schedule_items si
    where si.id = p_item_id

    union all

    select
      parent.id,
      parent.parent_item_id,
      parent.slug,
      chain.depth_from_item + 1
    from chain
    join public.schedule_items parent on parent.id = chain.parent_item_id
  )
  select coalesce(
    string_agg(c.slug, '.' order by c.depth_from_item desc),
    ''
  )
  from chain c;
$$;


ALTER FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") RETURNS bigint[]
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(
    array_agg(part::bigint order by ord),
    array[]::bigint[]
  )
  from unnest(regexp_split_to_array(coalesce(p_path_slug, ''), '[^0-9]+'))
    with ordinality as t(part, ord)
  where part <> '';
$$;


ALTER FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "parent_item_id" "uuid", "code" "text", "description" "text", "node_type" "public"."schedule_node_type", "depth" integer, "order_index" integer, "path_slug" "text", "rate" numeric, "unit_symbol" "text", "has_children" boolean, "ancestor_ids" "uuid"[], "annotations" "jsonb", "rates" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  with recursive matched as (
    select
      si.id,
      si.parent_item_id,
      si.code,
      si.description,
      si.node_type,
      public.nlevel(si.path) as depth,
      si.order_index,
      public.schedule_item_path_slug(si.id) as path_slug,
      si.rate,
      u.symbol as unit_symbol,
      exists (
        select 1
        from public.schedule_items child
        where child.parent_item_id = si.id
          and child.schedule_source_version_id = si.schedule_source_version_id
      ) as has_children,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'type', a.type,
              'raw_text', a.raw_text,
              'order_index', a.order_index,
              'metadata', a.metadata
            )
            order by a.order_index nulls last, a.created_at
          )
          from public.schedule_item_annotations a
          where a.schedule_item_id = si.id
        ),
        '[]'::jsonb
      ) as annotations,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'context', r.context,
              'label', r.label,
              'rate', r.rate,
              'rate_display', r.rate_display,
              'order_index', r.order_index
            )
            order by r.order_index nulls last, r.context
          )
          from public.schedule_item_rates r
          where r.schedule_item_id = si.id
        ),
        '[]'::jsonb
      ) as rates
    from public.schedule_items si
    left join public.units u on u.id = si.unit_id
    where si.schedule_source_version_id = p_schedule_source_version_id
      and length(trim(coalesce(p_query, ''))) >= 2
      and (
        si.code ilike '%' || trim(p_query) || '%'
        or si.description ilike '%' || trim(p_query) || '%'
      )
    order by
      case when si.code ilike trim(p_query) || '%' then 0 else 1 end,
      public.schedule_item_path_slug_sort_key(public.schedule_item_path_slug(si.id)),
      public.schedule_item_path_slug(si.id)
    limit greatest(coalesce(p_limit, 50), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  recursive_ancestors as (
    select
      m.id as item_id,
      parent.id as ancestor_id,
      parent.parent_item_id,
      1 as level_from_parent
    from matched m
    join public.schedule_items parent on parent.id = m.parent_item_id

    union all

    select
      ra.item_id,
      next_parent.id as ancestor_id,
      next_parent.parent_item_id,
      ra.level_from_parent + 1 as level_from_parent
    from recursive_ancestors ra
    join public.schedule_items next_parent on next_parent.id = ra.parent_item_id
  ),
  ancestor_path as (
    select
      item_id,
      coalesce(
        array_agg(ancestor_id order by level_from_parent desc),
        '{}'::uuid[]
      ) as ancestor_ids
    from recursive_ancestors
    group by item_id
  )
  select
    m.id,
    m.parent_item_id,
    m.code,
    m.description,
    m.node_type,
    m.depth,
    m.order_index,
    m.path_slug,
    m.rate,
    m.unit_symbol,
    m.has_children,
    coalesce(ap.ancestor_ids, '{}'::uuid[]) as ancestor_ids,
    m.annotations,
    m.rates
  from matched m
  left join ancestor_path ap on ap.item_id = m.id;
$$;


ALTER FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_client_schedule"("p_client_id" "uuid", "p_schedule_source_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_row_count int;
begin
  if not (select public.client_policy_ok(p_client_id, 'update')) then
    raise exception 'not allowed';
  end if;

  update public.client_schedules
  set is_default = false
  where client_id = p_client_id;

  update public.client_schedules
  set is_default = true
  where client_id = p_client_id
    and schedule_source_id = p_schedule_source_id;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise exception 'schedule link not found for client';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_default_client_schedule"("p_client_id" "uuid", "p_schedule_source_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_project_schedule"("p_project_id" "uuid", "p_schedule_source_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_row_count int;
begin
  if not (select public.project_policy_ok(p_project_id, 'update')) then
    raise exception 'not allowed';
  end if;

  update public.project_schedules
  set is_default = false
  where project_id = p_project_id;

  update public.project_schedules
  set is_default = true
  where project_id = p_project_id
    and schedule_source_id = p_schedule_source_id;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise exception 'schedule link not found for project';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_default_project_schedule"("p_project_id" "uuid", "p_schedule_source_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "active_role_id" "uuid",
    "display_name" "text",
    "avatar_url" "text",
    "permission_version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."tenant_members" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_active_role"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_role_slug" "text") RETURNS "public"."tenant_members"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  member_row public.tenant_members;
  v_role_id uuid;
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
  into v_role_id
  from authz.tenant_roles r
  join authz.tenant_member_roles tmr on tmr.tenant_role_id = r.id
  where r.tenant_id = p_tenant_id
    and r.slug = p_role_slug
    and tmr.tenant_member_id = member_row.id
  limit 1;

  if v_role_id is null then
    raise exception 'Role is not assigned to the member';
  end if;

  update public.tenant_members tm
  set active_role_id = v_role_id,
      updated_at = now()
  where tm.id = member_row.id
  returning * into member_row;

  return member_row;
end;
$$;


ALTER FUNCTION "public"."switch_active_role"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_role_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenant_member_roles"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_role_slugs" "text"[], "p_active_role_slug" "text" DEFAULT NULL::"text", "p_display_name" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text") RETURNS "public"."tenant_members"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  from authz.tenant_roles r
  where r.tenant_id = p_tenant_id
    and r.slug = any(p_role_slugs);

  if coalesce(array_length(desired_role_ids, 1), 0) <> array_length(p_role_slugs, 1) then
    raise exception 'One or more role slugs are invalid for the tenant';
  end if;

  delete from authz.tenant_member_roles tmr
  where tmr.tenant_member_id = member_row.id
    and not (tmr.tenant_role_id = any(desired_role_ids));

  insert into authz.tenant_member_roles (tenant_member_id, tenant_role_id)
  select member_row.id, desired_role_id
  from unnest(desired_role_ids) desired_role_id
  on conflict do nothing;

  if p_active_role_slug is not null then
    select r.id
    into resolved_active_role_id
    from authz.tenant_roles r
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


ALTER FUNCTION "public"."sync_tenant_member_roles"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_role_slugs" "text"[], "p_active_role_slug" "text", "p_display_name" "text", "p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_auth_session_service"("p_session_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select to_jsonb(private.touch_auth_session(p_session_id, p_tenant_id));
$$;


ALTER FUNCTION "public"."touch_auth_session_service"("p_session_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uuid_to_short_id"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select substr(replace(uid::text, '-', ''), 1, 12);
$$;


ALTER FUNCTION "public"."uuid_to_short_id"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "tests"."clear_auth_context"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{}'::jsonb::text, true);
end;
$$;


ALTER FUNCTION "tests"."clear_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "tests"."set_auth_context"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_active_role" "text" DEFAULT ''::"text", "p_pv" integer DEFAULT 1, "p_is_system_admin" boolean DEFAULT false, "p_is_locked" boolean DEFAULT false, "p_session_revoked" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id,
      'role', 'authenticated',
      'tid', p_tenant_id,
      'active_role', p_active_role,
      'pv', p_pv,
      'is_system_admin', p_is_system_admin,
      'is_locked', p_is_locked,
      'session_revoked', p_session_revoked
    )::text,
    true
  );
end;
$$;


ALTER FUNCTION "tests"."set_auth_context"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_active_role" "text", "p_pv" integer, "p_is_system_admin" boolean, "p_is_locked" boolean, "p_session_revoked" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."role_template_permissions" (
    "template_key" "text" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."role_template_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."role_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."role_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."tenant_member_roles" (
    "tenant_member_id" "uuid" NOT NULL,
    "tenant_role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."tenant_member_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."tenant_role_permissions" (
    "tenant_role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."tenant_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "authz"."tenant_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "template_key" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "authz"."tenant_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "private"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."audit_logs_2026_04" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."audit_logs_2026_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."audit_logs_2026_05" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."audit_logs_2026_05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."audit_logs_2026_06" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."audit_logs_2026_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."audit_logs_default" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."audit_logs_default" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."security_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "private"."security_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."security_events_2026_04" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "private"."security_events_2026_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."security_events_2026_05" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "private"."security_events_2026_05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."security_events_2026_06" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "private"."security_events_2026_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."security_events_default" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "private"."security_events_default" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."user_risk_scores" (
    "user_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "locked_at" timestamp with time zone,
    "lock_reason" "text",
    "locked_until" timestamp with time zone,
    "last_evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."user_risk_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attribute_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attribute_id" "uuid" NOT NULL,
    "value_text" "text",
    "value_number" numeric,
    "unit_id" "uuid",
    "normalized_value" numeric,
    "normalized_unit_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attribute_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attributes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."basic_rate_annotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "basic_rate_id" "uuid" NOT NULL,
    "type" "public"."schedule_annotation_type" DEFAULT 'note'::"public"."schedule_annotation_type" NOT NULL,
    "raw_text" "text" NOT NULL,
    "order_index" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."basic_rate_annotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."basic_rate_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."basic_rate_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."basic_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_source_version_id" "uuid" NOT NULL,
    "basic_rate_type_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "status" "public"."record_status" DEFAULT 'active'::"public"."record_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."basic_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "schedule_source_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "full_name" "text",
    "gstin" "text",
    "addresses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "contacts" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "clients_addresses_is_array" CHECK (("jsonb_typeof"("addresses") = 'array'::"text")),
    CONSTRAINT "clients_contacts_is_array" CHECK (("jsonb_typeof"("contacts") = 'array'::"text")),
    CONSTRAINT "clients_gstin_format_check" CHECK ((("gstin" IS NULL) OR ("gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$'::"text"))),
    CONSTRAINT "clients_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."derived_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "numerator_unit_id" "uuid",
    "denominator_unit_id" "uuid",
    "multiplier" numeric DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."derived_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "is_system_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "schedule_source_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_item_annotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_item_id" "uuid" NOT NULL,
    "type" "public"."schedule_annotation_type" DEFAULT 'note'::"public"."schedule_annotation_type" NOT NULL,
    "raw_text" "text" NOT NULL,
    "order_index" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."schedule_item_annotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_item_attributes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_item_id" "uuid" NOT NULL,
    "attribute_value_id" "uuid" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text",
    "confidence" numeric DEFAULT 1.0,
    "created_by" "uuid",
    "status" "public"."record_status" DEFAULT 'active'::"public"."record_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedule_item_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_item_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_item_id" "uuid" NOT NULL,
    "context" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "label" "text",
    "order_index" integer,
    "rate_display" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedule_item_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_source_version_id" "uuid" NOT NULL,
    "parent_item_id" "uuid",
    "path" "public"."ltree" NOT NULL,
    "slug" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "node_type" "public"."schedule_node_type" NOT NULL,
    "unit_id" "uuid",
    "derived_unit_id" "uuid",
    "rate" numeric,
    "item_type" "text" DEFAULT 'base'::"text",
    "order_index" integer,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"simple"'::"regconfig", ((COALESCE("description", ''::"text") || ' '::"text") || COALESCE("code", ''::"text")))) STORED,
    "ingestion_batch_id" "uuid",
    "source_page_number" integer,
    "status" "public"."record_status" DEFAULT 'active'::"public"."record_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schedule_items_check" CHECK (((("unit_id" IS NULL) AND ("derived_unit_id" IS NULL)) OR (("unit_id" IS NOT NULL) AND ("derived_unit_id" IS NULL)) OR (("unit_id" IS NULL) AND ("derived_unit_id" IS NOT NULL))))
);


ALTER TABLE "public"."schedule_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_source_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_source_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "year" integer,
    "region" "text",
    "metadata" "jsonb",
    "status" "public"."record_status" DEFAULT 'active'::"public"."record_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sort_order" double precision
);


ALTER TABLE "public"."schedule_source_versions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schedule_source_versions"."sort_order" IS 'Floating-point display order (lower first). Use fractions (e.g. 1.5 between 1 and 2) to insert without renumbering. Seeded from manifest source order when present.';



CREATE TABLE IF NOT EXISTS "public"."schedule_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "type" "public"."schedule_source_type",
    "status" "public"."record_status" DEFAULT 'active'::"public"."record_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedule_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "dimension" "text" NOT NULL,
    "is_base" boolean DEFAULT false,
    "conversion_factor" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."schedule_items_tree" WITH ("security_invoker"='true') AS
 SELECT "si"."code",
    "si"."id",
    "si"."schedule_source_version_id",
    "si"."parent_item_id",
    "si"."path",
    ("si"."path")::"text" AS "path_text",
    "public"."nlevel"("si"."path") AS "depth",
    ( SELECT "si_root"."id"
           FROM "public"."schedule_items" "si_root"
          WHERE (("si_root"."schedule_source_version_id" = "si"."schedule_source_version_id") AND ("si_root"."path" OPERATOR("public".=) "public"."subpath"("si"."path", 0, 1)))) AS "root_item_id",
    "si"."slug",
    "si"."description",
    "si"."node_type",
    "si"."unit_id",
    "si"."derived_unit_id",
    "u"."symbol" AS "unit_symbol",
    "u"."display_name" AS "unit_display_name",
    "du"."name" AS "derived_unit_name",
    "du"."display_name" AS "derived_unit_display_name",
    "si"."rate",
    "si"."item_type",
    "si"."order_index",
    "si"."ingestion_batch_id",
    "si"."source_page_number",
    "si"."status",
    "si"."created_at",
    "si"."updated_at",
    "p"."code" AS "parent_code",
    "p"."description" AS "parent_description",
    "ssv"."name" AS "source_version_name",
    "ssv"."display_name" AS "source_version_display_name",
    "ssv"."year" AS "source_version_year",
    "ss"."id" AS "schedule_source_id",
    "ss"."name" AS "schedule_source_name",
    "ss"."display_name" AS "schedule_source_display_name"
   FROM ((((("public"."schedule_items" "si"
     LEFT JOIN "public"."schedule_items" "p" ON (("p"."id" = "si"."parent_item_id")))
     JOIN "public"."schedule_source_versions" "ssv" ON (("ssv"."id" = "si"."schedule_source_version_id")))
     JOIN "public"."schedule_sources" "ss" ON (("ss"."id" = "ssv"."schedule_source_id")))
     LEFT JOIN "public"."units" "u" ON (("u"."id" = "si"."unit_id")))
     LEFT JOIN "public"."derived_units" "du" ON (("du"."id" = "si"."derived_unit_id")));


ALTER VIEW "public"."schedule_items_tree" OWNER TO "postgres";


COMMENT ON VIEW "public"."schedule_items_tree" IS 'Schedule items with tree metadata (depth, root, path_text), parent codes, and source/version + unit context.';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text",
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "logo_icon_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "private"."audit_logs" ATTACH PARTITION "private"."audit_logs_2026_04" FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');



ALTER TABLE ONLY "private"."audit_logs" ATTACH PARTITION "private"."audit_logs_2026_05" FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');



ALTER TABLE ONLY "private"."audit_logs" ATTACH PARTITION "private"."audit_logs_2026_06" FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');



ALTER TABLE ONLY "private"."audit_logs" ATTACH PARTITION "private"."audit_logs_default" DEFAULT;



ALTER TABLE ONLY "private"."security_events" ATTACH PARTITION "private"."security_events_2026_04" FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');



ALTER TABLE ONLY "private"."security_events" ATTACH PARTITION "private"."security_events_2026_05" FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');



ALTER TABLE ONLY "private"."security_events" ATTACH PARTITION "private"."security_events_2026_06" FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');



ALTER TABLE ONLY "private"."security_events" ATTACH PARTITION "private"."security_events_default" DEFAULT;



ALTER TABLE ONLY "authz"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "authz"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "authz"."tenant_role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("tenant_role_id", "permission_id");



ALTER TABLE ONLY "authz"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_pkey" PRIMARY KEY ("template_key", "permission_id");



ALTER TABLE ONLY "authz"."tenant_roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "authz"."tenant_roles"
    ADD CONSTRAINT "roles_tenant_id_slug_key" UNIQUE ("tenant_id", "slug");



ALTER TABLE ONLY "authz"."role_templates"
    ADD CONSTRAINT "system_roles_key_key" UNIQUE ("key");



ALTER TABLE ONLY "authz"."role_templates"
    ADD CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "authz"."tenant_member_roles"
    ADD CONSTRAINT "tenant_member_roles_pkey" PRIMARY KEY ("tenant_member_id", "tenant_role_id");



ALTER TABLE ONLY "private"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."audit_logs_2026_04"
    ADD CONSTRAINT "audit_logs_2026_04_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."audit_logs_2026_05"
    ADD CONSTRAINT "audit_logs_2026_05_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."audit_logs_2026_06"
    ADD CONSTRAINT "audit_logs_2026_06_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."audit_logs_default"
    ADD CONSTRAINT "audit_logs_default_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."security_alerts"
    ADD CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."security_events"
    ADD CONSTRAINT "security_events_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."security_events_2026_04"
    ADD CONSTRAINT "security_events_2026_04_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."security_events_2026_05"
    ADD CONSTRAINT "security_events_2026_05_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."security_events_2026_06"
    ADD CONSTRAINT "security_events_2026_06_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."security_events_default"
    ADD CONSTRAINT "security_events_default_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "private"."user_risk_scores"
    ADD CONSTRAINT "user_risk_scores_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."basic_rate_annotations"
    ADD CONSTRAINT "basic_rate_annotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."basic_rate_types"
    ADD CONSTRAINT "basic_rate_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."basic_rate_types"
    ADD CONSTRAINT "basic_rate_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."basic_rates"
    ADD CONSTRAINT "basic_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."basic_rates"
    ADD CONSTRAINT "basic_rates_schedule_source_version_id_code_key" UNIQUE ("schedule_source_version_id", "code");



ALTER TABLE ONLY "public"."client_schedules"
    ADD CONSTRAINT "client_schedules_client_id_schedule_source_id_key" UNIQUE ("client_id", "schedule_source_id");



ALTER TABLE ONLY "public"."client_schedules"
    ADD CONSTRAINT "client_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."derived_units"
    ADD CONSTRAINT "derived_units_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."derived_units"
    ADD CONSTRAINT "derived_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_role_id_key" UNIQUE ("project_id", "user_id", "role_id");



ALTER TABLE ONLY "public"."project_schedules"
    ADD CONSTRAINT "project_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_schedules"
    ADD CONSTRAINT "project_schedules_project_id_schedule_source_id_key" UNIQUE ("project_id", "schedule_source_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_item_annotations"
    ADD CONSTRAINT "schedule_item_annotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_item_attributes"
    ADD CONSTRAINT "schedule_item_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_item_rates"
    ADD CONSTRAINT "schedule_item_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_item_rates"
    ADD CONSTRAINT "schedule_item_rates_schedule_item_id_context_key" UNIQUE ("schedule_item_id", "context");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_schedule_source_version_id_parent_item_id_co_key" UNIQUE ("schedule_source_version_id", "parent_item_id", "code");



ALTER TABLE ONLY "public"."schedule_source_versions"
    ADD CONSTRAINT "schedule_source_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_source_versions"
    ADD CONSTRAINT "schedule_source_versions_schedule_source_id_name_key" UNIQUE ("schedule_source_id", "name");



ALTER TABLE ONLY "public"."schedule_sources"
    ADD CONSTRAINT "schedule_sources_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."schedule_sources"
    ADD CONSTRAINT "schedule_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_symbol_key" UNIQUE ("symbol");



CREATE INDEX "idx_role_template_permissions_permission_id" ON "authz"."role_template_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_tenant_member_roles_member" ON "authz"."tenant_member_roles" USING "btree" ("tenant_member_id");



CREATE INDEX "idx_tenant_member_roles_tenant_role" ON "authz"."tenant_member_roles" USING "btree" ("tenant_role_id");



CREATE INDEX "idx_tenant_role_permissions_permission_id" ON "authz"."tenant_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_tenant_roles_tenant_id" ON "authz"."tenant_roles" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_logs_resource" ON ONLY "private"."audit_logs" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "audit_logs_2026_04_resource_type_resource_id_idx" ON "private"."audit_logs_2026_04" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_audit_logs_tenant" ON ONLY "private"."audit_logs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "audit_logs_2026_04_tenant_id_created_at_idx" ON "private"."audit_logs_2026_04" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "audit_logs_2026_05_resource_type_resource_id_idx" ON "private"."audit_logs_2026_05" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "audit_logs_2026_05_tenant_id_created_at_idx" ON "private"."audit_logs_2026_05" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "audit_logs_2026_06_resource_type_resource_id_idx" ON "private"."audit_logs_2026_06" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "audit_logs_2026_06_tenant_id_created_at_idx" ON "private"."audit_logs_2026_06" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "audit_logs_default_resource_type_resource_id_idx" ON "private"."audit_logs_default" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "audit_logs_default_tenant_id_created_at_idx" ON "private"."audit_logs_default" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_auth_sessions_tenant" ON "private"."auth_sessions" USING "btree" ("tenant_id");



CREATE INDEX "idx_auth_sessions_user" ON "private"."auth_sessions" USING "btree" ("user_id", "is_revoked");



CREATE INDEX "idx_security_alerts_status" ON "private"."security_alerts" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_security_events_tenant" ON ONLY "private"."security_events" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_security_events_user" ON ONLY "private"."security_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "security_events_2026_04_tenant_id_created_at_idx" ON "private"."security_events_2026_04" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "security_events_2026_04_user_id_created_at_idx" ON "private"."security_events_2026_04" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "security_events_2026_05_tenant_id_created_at_idx" ON "private"."security_events_2026_05" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "security_events_2026_05_user_id_created_at_idx" ON "private"."security_events_2026_05" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "security_events_2026_06_tenant_id_created_at_idx" ON "private"."security_events_2026_06" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "security_events_2026_06_user_id_created_at_idx" ON "private"."security_events_2026_06" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "security_events_default_tenant_id_created_at_idx" ON "private"."security_events_default" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "security_events_default_user_id_created_at_idx" ON "private"."security_events_default" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "client_schedules_client_id_idx" ON "public"."client_schedules" USING "btree" ("client_id");



CREATE UNIQUE INDEX "client_schedules_one_default_per_client" ON "public"."client_schedules" USING "btree" ("client_id") WHERE "is_default";



CREATE INDEX "client_schedules_schedule_source_id_idx" ON "public"."client_schedules" USING "btree" ("schedule_source_id");



CREATE INDEX "clients_addresses_gin_idx" ON "public"."clients" USING "gin" ("addresses");



CREATE INDEX "clients_contacts_gin_idx" ON "public"."clients" USING "gin" ("contacts");



CREATE INDEX "clients_meta_gin_idx" ON "public"."clients" USING "gin" ("meta");



CREATE INDEX "clients_tenant_created_idx" ON "public"."clients" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "clients_tenant_display_name_idx" ON "public"."clients" USING "btree" ("tenant_id", "display_name");



CREATE INDEX "clients_tenant_gstin_idx" ON "public"."clients" USING "btree" ("tenant_id", "gstin") WHERE ("gstin" IS NOT NULL);



CREATE INDEX "clients_tenant_status_idx" ON "public"."clients" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_basic_rate_annotations_basic_rate" ON "public"."basic_rate_annotations" USING "btree" ("basic_rate_id");



CREATE INDEX "idx_basic_rates_schedule_source_version" ON "public"."basic_rates" USING "btree" ("schedule_source_version_id");



CREATE INDEX "idx_basic_rates_type" ON "public"."basic_rates" USING "btree" ("basic_rate_type_id");



CREATE INDEX "idx_basic_rates_unit" ON "public"."basic_rates" USING "btree" ("unit");



CREATE INDEX "idx_schedule_item_annotations_item" ON "public"."schedule_item_annotations" USING "btree" ("schedule_item_id");



CREATE INDEX "idx_schedule_item_attributes_item" ON "public"."schedule_item_attributes" USING "btree" ("schedule_item_id");



CREATE INDEX "idx_schedule_item_rates_item" ON "public"."schedule_item_rates" USING "btree" ("schedule_item_id");



CREATE INDEX "idx_schedule_item_rates_item_order" ON "public"."schedule_item_rates" USING "btree" ("schedule_item_id", "order_index");



CREATE INDEX "idx_schedule_items_active" ON "public"."schedule_items" USING "btree" ("schedule_source_version_id") WHERE ("status" = 'active'::"public"."record_status");



CREATE INDEX "idx_schedule_items_batch" ON "public"."schedule_items" USING "btree" ("ingestion_batch_id") WHERE ("ingestion_batch_id" IS NOT NULL);



CREATE INDEX "idx_schedule_items_code" ON "public"."schedule_items" USING "btree" ("schedule_source_version_id", "code" "text_pattern_ops");



CREATE INDEX "idx_schedule_items_code_trgm" ON "public"."schedule_items" USING "gin" ("code" "public"."gin_trgm_ops");



CREATE INDEX "idx_schedule_items_parent" ON "public"."schedule_items" USING "btree" ("parent_item_id");



CREATE INDEX "idx_schedule_items_path_btree" ON "public"."schedule_items" USING "btree" ("path");



CREATE INDEX "idx_schedule_items_path_gist" ON "public"."schedule_items" USING "gist" ("path");



CREATE INDEX "idx_schedule_items_roots" ON "public"."schedule_items" USING "btree" ("schedule_source_version_id") WHERE ("parent_item_id" IS NULL);



CREATE INDEX "idx_schedule_items_search" ON "public"."schedule_items" USING "gin" ("search_vector");



CREATE INDEX "idx_schedule_items_version" ON "public"."schedule_items" USING "btree" ("schedule_source_version_id");



CREATE INDEX "idx_tenant_members_tenant_status" ON "public"."tenant_members" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_tenant_members_user_id" ON "public"."tenant_members" USING "btree" ("user_id");



CREATE INDEX "project_members_project_id_idx" ON "public"."project_members" USING "btree" ("project_id");



CREATE INDEX "project_members_role_id_idx" ON "public"."project_members" USING "btree" ("role_id");



CREATE INDEX "project_members_user_id_idx" ON "public"."project_members" USING "btree" ("user_id");



CREATE UNIQUE INDEX "project_schedules_one_default_per_project" ON "public"."project_schedules" USING "btree" ("project_id") WHERE "is_default";



CREATE INDEX "project_schedules_project_id_idx" ON "public"."project_schedules" USING "btree" ("project_id");



CREATE INDEX "project_schedules_schedule_source_id_idx" ON "public"."project_schedules" USING "btree" ("schedule_source_id");



CREATE INDEX "projects_meta_gin_idx" ON "public"."projects" USING "gin" ("meta");



CREATE INDEX "projects_tenant_created_idx" ON "public"."projects" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "projects_tenant_name_idx" ON "public"."projects" USING "btree" ("tenant_id", "name");



CREATE INDEX "projects_tenant_status_idx" ON "public"."projects" USING "btree" ("tenant_id", "status");



ALTER INDEX "private"."audit_logs_pkey" ATTACH PARTITION "private"."audit_logs_2026_04_pkey";



ALTER INDEX "private"."idx_audit_logs_resource" ATTACH PARTITION "private"."audit_logs_2026_04_resource_type_resource_id_idx";



ALTER INDEX "private"."idx_audit_logs_tenant" ATTACH PARTITION "private"."audit_logs_2026_04_tenant_id_created_at_idx";



ALTER INDEX "private"."audit_logs_pkey" ATTACH PARTITION "private"."audit_logs_2026_05_pkey";



ALTER INDEX "private"."idx_audit_logs_resource" ATTACH PARTITION "private"."audit_logs_2026_05_resource_type_resource_id_idx";



ALTER INDEX "private"."idx_audit_logs_tenant" ATTACH PARTITION "private"."audit_logs_2026_05_tenant_id_created_at_idx";



ALTER INDEX "private"."audit_logs_pkey" ATTACH PARTITION "private"."audit_logs_2026_06_pkey";



ALTER INDEX "private"."idx_audit_logs_resource" ATTACH PARTITION "private"."audit_logs_2026_06_resource_type_resource_id_idx";



ALTER INDEX "private"."idx_audit_logs_tenant" ATTACH PARTITION "private"."audit_logs_2026_06_tenant_id_created_at_idx";



ALTER INDEX "private"."audit_logs_pkey" ATTACH PARTITION "private"."audit_logs_default_pkey";



ALTER INDEX "private"."idx_audit_logs_resource" ATTACH PARTITION "private"."audit_logs_default_resource_type_resource_id_idx";



ALTER INDEX "private"."idx_audit_logs_tenant" ATTACH PARTITION "private"."audit_logs_default_tenant_id_created_at_idx";



ALTER INDEX "private"."security_events_pkey" ATTACH PARTITION "private"."security_events_2026_04_pkey";



ALTER INDEX "private"."idx_security_events_tenant" ATTACH PARTITION "private"."security_events_2026_04_tenant_id_created_at_idx";



ALTER INDEX "private"."idx_security_events_user" ATTACH PARTITION "private"."security_events_2026_04_user_id_created_at_idx";



ALTER INDEX "private"."security_events_pkey" ATTACH PARTITION "private"."security_events_2026_05_pkey";



ALTER INDEX "private"."idx_security_events_tenant" ATTACH PARTITION "private"."security_events_2026_05_tenant_id_created_at_idx";



ALTER INDEX "private"."idx_security_events_user" ATTACH PARTITION "private"."security_events_2026_05_user_id_created_at_idx";



ALTER INDEX "private"."security_events_pkey" ATTACH PARTITION "private"."security_events_2026_06_pkey";



ALTER INDEX "private"."idx_security_events_tenant" ATTACH PARTITION "private"."security_events_2026_06_tenant_id_created_at_idx";



ALTER INDEX "private"."idx_security_events_user" ATTACH PARTITION "private"."security_events_2026_06_user_id_created_at_idx";



ALTER INDEX "private"."security_events_pkey" ATTACH PARTITION "private"."security_events_default_pkey";



ALTER INDEX "private"."idx_security_events_tenant" ATTACH PARTITION "private"."security_events_default_tenant_id_created_at_idx";



ALTER INDEX "private"."idx_security_events_user" ATTACH PARTITION "private"."security_events_default_user_id_created_at_idx";



CREATE OR REPLACE TRIGGER "audit_role_permissions" AFTER INSERT OR DELETE OR UPDATE ON "authz"."tenant_role_permissions" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_role_template_permissions" AFTER INSERT OR DELETE OR UPDATE ON "authz"."role_template_permissions" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_roles" AFTER INSERT OR DELETE OR UPDATE ON "authz"."tenant_roles" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_tenant_member_roles" AFTER INSERT OR DELETE OR UPDATE ON "authz"."tenant_member_roles" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "bump_pv_on_member_role_change" AFTER INSERT OR DELETE ON "authz"."tenant_member_roles" FOR EACH ROW EXECUTE FUNCTION "authz"."on_member_role_change"();



CREATE OR REPLACE TRIGGER "bump_pv_on_role_permission_change" AFTER INSERT OR DELETE ON "authz"."tenant_role_permissions" FOR EACH ROW EXECUTE FUNCTION "authz"."on_role_permission_change"();



CREATE OR REPLACE TRIGGER "set_roles_updated_at" BEFORE UPDATE ON "authz"."tenant_roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_security_event_create_alerts" AFTER INSERT ON "private"."security_events" FOR EACH ROW EXECUTE FUNCTION "private"."create_security_alerts"();



CREATE OR REPLACE TRIGGER "on_security_event_notify" AFTER INSERT ON "private"."security_events" FOR EACH ROW EXECUTE FUNCTION "private"."notify_security_alert"();



CREATE OR REPLACE TRIGGER "set_user_risk_scores_updated_at" BEFORE UPDATE ON "private"."user_risk_scores" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "audit_client_schedules" AFTER INSERT OR DELETE OR UPDATE ON "public"."client_schedules" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_clients" AFTER INSERT OR DELETE OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_schedule_source_versions" AFTER INSERT OR DELETE OR UPDATE ON "public"."schedule_source_versions" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_schedule_sources" AFTER INSERT OR DELETE OR UPDATE ON "public"."schedule_sources" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_tenant_members" AFTER INSERT OR DELETE OR UPDATE ON "public"."tenant_members" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "audit_tenants" AFTER INSERT OR DELETE OR UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "private"."capture_audit_log"();



CREATE OR REPLACE TRIGGER "client_schedules_clear_other_defaults" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."client_schedules" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."client_schedules_clear_other_defaults"();



CREATE OR REPLACE TRIGGER "client_schedules_set_updated_at" BEFORE UPDATE ON "public"."client_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "clients_set_tenant_before_insert" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."clients_set_tenant_before_insert"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_tenant_created" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_tenant"();



CREATE OR REPLACE TRIGGER "project_members_enforce_role_tenant" BEFORE INSERT OR UPDATE ON "public"."project_members" FOR EACH ROW EXECUTE FUNCTION "public"."project_members_enforce_role_tenant"();



CREATE OR REPLACE TRIGGER "project_schedules_clear_other_defaults" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."project_schedules" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."project_schedules_clear_other_defaults"();



CREATE OR REPLACE TRIGGER "project_schedules_set_updated_at" BEFORE UPDATE ON "public"."project_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "projects_set_tenant_before_insert" BEFORE INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."projects_set_tenant_before_insert"();



CREATE OR REPLACE TRIGGER "projects_set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "protect_profiles_system_admin" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_system_admin_flag"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenant_members_updated_at" BEFORE UPDATE ON "public"."tenant_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."attributes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."basic_rate_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."basic_rates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."derived_units" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."schedule_item_attributes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."schedule_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."schedule_source_versions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."schedule_sources" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."units" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_compute_path" BEFORE INSERT OR UPDATE OF "parent_item_id" ON "public"."schedule_items" FOR EACH ROW EXECUTE FUNCTION "public"."compute_schedule_item_path"();



ALTER TABLE ONLY "authz"."tenant_role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "authz"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."tenant_role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("tenant_role_id") REFERENCES "authz"."tenant_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "authz"."permissions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."role_template_permissions"
    ADD CONSTRAINT "role_template_permissions_template_key_fkey" FOREIGN KEY ("template_key") REFERENCES "authz"."role_templates"("key") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."tenant_roles"
    ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."tenant_member_roles"
    ADD CONSTRAINT "tenant_member_roles_role_id_fkey" FOREIGN KEY ("tenant_role_id") REFERENCES "authz"."tenant_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."tenant_member_roles"
    ADD CONSTRAINT "tenant_member_roles_tenant_member_id_fkey" FOREIGN KEY ("tenant_member_id") REFERENCES "public"."tenant_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "authz"."tenant_roles"
    ADD CONSTRAINT "tenant_roles_template_key_fkey" FOREIGN KEY ("template_key") REFERENCES "authz"."role_templates"("key");



ALTER TABLE "private"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE "private"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."auth_sessions"
    ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."security_alerts"
    ADD CONSTRAINT "security_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE "private"."security_events"
    ADD CONSTRAINT "security_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE "private"."security_events"
    ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."user_risk_scores"
    ADD CONSTRAINT "user_risk_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_normalized_unit_id_fkey" FOREIGN KEY ("normalized_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."attribute_values"
    ADD CONSTRAINT "attribute_values_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."basic_rate_annotations"
    ADD CONSTRAINT "basic_rate_annotations_basic_rate_id_fkey" FOREIGN KEY ("basic_rate_id") REFERENCES "public"."basic_rates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."basic_rates"
    ADD CONSTRAINT "basic_rates_basic_rate_type_id_fkey" FOREIGN KEY ("basic_rate_type_id") REFERENCES "public"."basic_rate_types"("id");



ALTER TABLE ONLY "public"."basic_rates"
    ADD CONSTRAINT "basic_rates_schedule_source_version_id_fkey" FOREIGN KEY ("schedule_source_version_id") REFERENCES "public"."schedule_source_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_schedules"
    ADD CONSTRAINT "client_schedules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_schedules"
    ADD CONSTRAINT "client_schedules_schedule_source_id_fkey" FOREIGN KEY ("schedule_source_id") REFERENCES "public"."schedule_sources"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."derived_units"
    ADD CONSTRAINT "derived_units_denominator_unit_id_fkey" FOREIGN KEY ("denominator_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."derived_units"
    ADD CONSTRAINT "derived_units_numerator_unit_id_fkey" FOREIGN KEY ("numerator_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "authz"."tenant_roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_schedules"
    ADD CONSTRAINT "project_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_schedules"
    ADD CONSTRAINT "project_schedules_schedule_source_id_fkey" FOREIGN KEY ("schedule_source_id") REFERENCES "public"."schedule_sources"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_item_annotations"
    ADD CONSTRAINT "schedule_item_annotations_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "public"."schedule_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_item_attributes"
    ADD CONSTRAINT "schedule_item_attributes_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_item_attributes"
    ADD CONSTRAINT "schedule_item_attributes_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "public"."schedule_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_item_rates"
    ADD CONSTRAINT "schedule_item_rates_schedule_item_id_fkey" FOREIGN KEY ("schedule_item_id") REFERENCES "public"."schedule_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_derived_unit_id_fkey" FOREIGN KEY ("derived_unit_id") REFERENCES "public"."derived_units"("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "public"."schedule_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_schedule_source_version_id_fkey" FOREIGN KEY ("schedule_source_version_id") REFERENCES "public"."schedule_source_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."schedule_source_versions"
    ADD CONSTRAINT "schedule_source_versions_schedule_source_id_fkey" FOREIGN KEY ("schedule_source_id") REFERENCES "public"."schedule_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_active_role_id_fkey" FOREIGN KEY ("active_role_id") REFERENCES "authz"."tenant_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "roles_select_authenticated" ON "authz"."tenant_roles" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")))));



ALTER TABLE "authz"."tenant_member_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_member_roles_delete" ON "authz"."tenant_member_roles" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND (EXISTS ( SELECT 1
   FROM "public"."tenant_members" "tm"
  WHERE (("tm"."id" = "tenant_member_roles"."tenant_member_id") AND ("tm"."tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")))))));



CREATE POLICY "tenant_member_roles_insert" ON "authz"."tenant_member_roles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND (EXISTS ( SELECT 1
   FROM ("public"."tenant_members" "tm"
     JOIN "authz"."tenant_roles" "r" ON (("r"."id" = "tenant_member_roles"."tenant_role_id")))
  WHERE (("tm"."id" = "tenant_member_roles"."tenant_member_id") AND ("tm"."tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ("r"."tenant_id" = "tm"."tenant_id"))))));



CREATE POLICY "tenant_member_roles_select" ON "authz"."tenant_member_roles" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (EXISTS ( SELECT 1
   FROM "public"."tenant_members" "tm"
  WHERE (("tm"."id" = "tenant_member_roles"."tenant_member_id") AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ("tm"."tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND (("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission")))))))));



ALTER TABLE "authz"."tenant_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attribute_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attribute_values_delete" ON "public"."attribute_values" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "attribute_values_insert" ON "public"."attribute_values" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "attribute_values_select" ON "public"."attribute_values" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "attribute_values_update" ON "public"."attribute_values" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."attributes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attributes_delete" ON "public"."attributes" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "attributes_insert" ON "public"."attributes" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "attributes_select" ON "public"."attributes" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "attributes_update" ON "public"."attributes" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."basic_rate_annotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "basic_rate_annotations_delete" ON "public"."basic_rate_annotations" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_annotations_insert" ON "public"."basic_rate_annotations" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_annotations_select" ON "public"."basic_rate_annotations" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.read'::"text") OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_annotations_update" ON "public"."basic_rate_annotations" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



ALTER TABLE "public"."basic_rate_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "basic_rate_types_delete" ON "public"."basic_rate_types" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_types_insert" ON "public"."basic_rate_types" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_types_select" ON "public"."basic_rate_types" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.read'::"text") OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rate_types_update" ON "public"."basic_rate_types" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



ALTER TABLE "public"."basic_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "basic_rates_delete" ON "public"."basic_rates" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rates_insert" ON "public"."basic_rates" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rates_select" ON "public"."basic_rates" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.read'::"text") OR "authz"."has_permission"('basic_rates.manage'::"text"))));



CREATE POLICY "basic_rates_update" ON "public"."basic_rates" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('basic_rates.manage'::"text"))));



ALTER TABLE "public"."client_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_schedules_delete" ON "public"."client_schedules" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("client_schedules"."client_id", 'update'::"text") AS "client_policy_ok")));



CREATE POLICY "client_schedules_insert" ON "public"."client_schedules" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."client_policy_ok"("client_schedules"."client_id", 'update'::"text") AS "client_policy_ok")));



CREATE POLICY "client_schedules_select" ON "public"."client_schedules" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("client_schedules"."client_id", 'read'::"text") AS "client_policy_ok")));



CREATE POLICY "client_schedules_update" ON "public"."client_schedules" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("client_schedules"."client_id", 'update'::"text") AS "client_policy_ok"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."client_policy_ok"("client_schedules"."client_id", 'update'::"text") AS "client_policy_ok")));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("clients"."id", 'delete'::"text") AS "client_policy_ok")));



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ( SELECT "authz"."has_permission_for_tenant"("clients"."tenant_id", 'clients.manage'::"text") AS "has_permission_for_tenant"))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("clients"."id", 'read'::"text") AS "client_policy_ok")));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."client_policy_ok"("clients"."id", 'update'::"text") AS "client_policy_ok"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")))));



ALTER TABLE "public"."derived_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "derived_units_delete" ON "public"."derived_units" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "derived_units_insert" ON "public"."derived_units" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "derived_units_select" ON "public"."derived_units" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "derived_units_update" ON "public"."derived_units" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."is_system_admin"() AS "is_system_admin")));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_public" = true) OR (EXISTS ( SELECT 1
   FROM ("public"."tenant_members" "current_tm"
     JOIN "public"."tenant_members" "profile_tm" ON ((("profile_tm"."user_id" = "profiles"."id") AND ("profile_tm"."tenant_id" = "current_tm"."tenant_id"))))
  WHERE (("current_tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("current_tm"."status" = 'active'::"text") AND ("profile_tm"."status" = 'active'::"text")))))));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_members_delete" ON "public"."project_members" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_members"."project_id", 'update'::"text") AS "project_policy_ok")));



CREATE POLICY "project_members_insert" ON "public"."project_members" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."project_policy_ok"("project_members"."project_id", 'update'::"text") AS "project_policy_ok")));



CREATE POLICY "project_members_select" ON "public"."project_members" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_members"."project_id", 'read'::"text") AS "project_policy_ok")));



CREATE POLICY "project_members_update" ON "public"."project_members" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_members"."project_id", 'update'::"text") AS "project_policy_ok"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."project_policy_ok"("project_members"."project_id", 'update'::"text") AS "project_policy_ok")));



ALTER TABLE "public"."project_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_schedules_delete" ON "public"."project_schedules" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_schedules"."project_id", 'update'::"text") AS "project_policy_ok")));



CREATE POLICY "project_schedules_insert" ON "public"."project_schedules" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."project_policy_ok"("project_schedules"."project_id", 'update'::"text") AS "project_policy_ok")));



CREATE POLICY "project_schedules_select" ON "public"."project_schedules" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_schedules"."project_id", 'read'::"text") AS "project_policy_ok")));



CREATE POLICY "project_schedules_update" ON "public"."project_schedules" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("project_schedules"."project_id", 'update'::"text") AS "project_policy_ok"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ( SELECT "public"."project_policy_ok"("project_schedules"."project_id", 'update'::"text") AS "project_policy_ok")));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete" ON "public"."projects" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("projects"."id", 'delete'::"text") AS "project_policy_ok")));



CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ( SELECT "authz"."has_permission_for_tenant"("projects"."tenant_id", 'projects.manage'::"text") AS "has_permission_for_tenant"))));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("projects"."id", 'read'::"text") AS "project_policy_ok")));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "public"."project_policy_ok"("projects"."id", 'update'::"text") AS "project_policy_ok"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR ("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")))));



ALTER TABLE "public"."schedule_item_annotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_item_annotations_delete" ON "public"."schedule_item_annotations" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_annotations_insert" ON "public"."schedule_item_annotations" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_annotations_select" ON "public"."schedule_item_annotations" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_item_annotations_update" ON "public"."schedule_item_annotations" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."schedule_item_attributes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_item_attributes_delete" ON "public"."schedule_item_attributes" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_attributes_insert" ON "public"."schedule_item_attributes" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_attributes_select" ON "public"."schedule_item_attributes" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_item_attributes_update" ON "public"."schedule_item_attributes" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."schedule_item_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_item_rates_delete" ON "public"."schedule_item_rates" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_rates_insert" ON "public"."schedule_item_rates" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_item_rates_select" ON "public"."schedule_item_rates" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_item_rates_update" ON "public"."schedule_item_rates" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."schedule_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_items_delete" ON "public"."schedule_items" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "schedule_items_insert" ON "public"."schedule_items" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_items_select" ON "public"."schedule_items" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_items_update" ON "public"."schedule_items" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."schedule_source_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_source_versions_delete" ON "public"."schedule_source_versions" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "schedule_source_versions_insert" ON "public"."schedule_source_versions" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_source_versions_select" ON "public"."schedule_source_versions" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_source_versions_update" ON "public"."schedule_source_versions" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."schedule_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedule_sources_delete" ON "public"."schedule_sources" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "schedule_sources_insert" ON "public"."schedule_sources" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



CREATE POLICY "schedule_sources_select" ON "public"."schedule_sources" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "schedule_sources_update" ON "public"."schedule_sources" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND ("authz"."is_system_admin"() OR "authz"."has_permission"('schedules.manage'::"text"))));



ALTER TABLE "public"."tenant_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_members_delete" ON "public"."tenant_members" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version")))));



CREATE POLICY "tenant_members_insert" ON "public"."tenant_members" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version")))));



CREATE POLICY "tenant_members_select" ON "public"."tenant_members" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (( SELECT "authz"."check_permission_version"() AS "check_permission_version") AND ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id"))) OR (("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission")))))));



CREATE POLICY "tenant_members_update" ON "public"."tenant_members" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version"))))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (("tenant_id" = ( SELECT "authz"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "authz"."has_permission"('tenant_members.manage'::"text") AS "has_permission") AND ( SELECT "authz"."check_permission_version"() AS "check_permission_version")))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_delete" ON "public"."tenants" FOR DELETE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."is_system_admin"() AS "is_system_admin")));



CREATE POLICY "tenants_insert" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."is_system_admin"() AS "is_system_admin")));



CREATE POLICY "tenants_select" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND (( SELECT "authz"."is_system_admin"() AS "is_system_admin") OR (EXISTS ( SELECT 1
   FROM "public"."tenant_members" "tm"
  WHERE (("tm"."tenant_id" = "tenants"."id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."status" = 'active'::"text")))))));



CREATE POLICY "tenants_update" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."is_system_admin"() AS "is_system_admin"))) WITH CHECK ((( SELECT "authz"."is_session_valid"() AS "is_session_valid") AND (NOT ( SELECT "authz"."is_account_locked"() AS "is_account_locked")) AND ( SELECT "authz"."is_system_admin"() AS "is_system_admin")));



ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "units_delete" ON "public"."units" FOR DELETE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "units_insert" ON "public"."units" FOR INSERT TO "authenticated" WITH CHECK (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));



CREATE POLICY "units_select" ON "public"."units" FOR SELECT TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"())));



CREATE POLICY "units_update" ON "public"."units" FOR UPDATE TO "authenticated" USING (("authz"."is_session_valid"() AND (NOT "authz"."is_account_locked"()) AND "authz"."is_system_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "authz" TO "authenticated";
GRANT USAGE ON SCHEMA "authz" TO "service_role";
GRANT USAGE ON SCHEMA "authz" TO "supabase_auth_admin";









GRANT USAGE ON SCHEMA "private" TO "service_role";
GRANT USAGE ON SCHEMA "private" TO "supabase_auth_admin";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT USAGE ON SCHEMA "tests" TO "authenticated";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."lquery_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."lquery_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."lquery_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lquery_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."lquery_out"("public"."lquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."lquery_out"("public"."lquery") TO "anon";
GRANT ALL ON FUNCTION "public"."lquery_out"("public"."lquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lquery_out"("public"."lquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."lquery_recv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."lquery_recv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."lquery_recv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lquery_recv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."lquery_send"("public"."lquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."lquery_send"("public"."lquery") TO "anon";
GRANT ALL ON FUNCTION "public"."lquery_send"("public"."lquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lquery_send"("public"."lquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_out"("public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_out"("public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_out"("public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_out"("public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_recv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_recv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_recv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_recv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_send"("public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_send"("public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_send"("public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_send"("public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_gist_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_gist_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_gist_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_gist_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_gist_out"("public"."ltree_gist") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_gist_out"("public"."ltree_gist") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_gist_out"("public"."ltree_gist") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_gist_out"("public"."ltree_gist") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_out"("public"."ltxtquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_out"("public"."ltxtquery") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_out"("public"."ltxtquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_out"("public"."ltxtquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_recv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_recv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_recv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_recv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_send"("public"."ltxtquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_send"("public"."ltxtquery") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_send"("public"."ltxtquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_send"("public"."ltxtquery") TO "service_role";



GRANT ALL ON FUNCTION "authz"."bump_permission_version"("p_tenant_member_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "authz"."check_permission_version"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."check_permission_version"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."check_permission_version_for_tenant"("p_tenant_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "authz"."check_permission_version_for_tenant"("p_tenant_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "authz"."current_active_role"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."current_active_role"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."current_session_id"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."current_session_id"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."current_tenant_id"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."current_tenant_id"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."default_platform_tenant_id"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."default_platform_tenant_id"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."has_permission"("p" "text") TO "service_role";
GRANT ALL ON FUNCTION "authz"."has_permission"("p" "text") TO "authenticated";



GRANT ALL ON FUNCTION "authz"."has_permission_for_tenant"("p_tenant_id" "uuid", "p_permission" "text") TO "service_role";
GRANT ALL ON FUNCTION "authz"."has_permission_for_tenant"("p_tenant_id" "uuid", "p_permission" "text") TO "authenticated";



GRANT ALL ON FUNCTION "authz"."is_account_locked"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."is_account_locked"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."is_session_valid"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."is_session_valid"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."is_system_admin"() TO "service_role";
GRANT ALL ON FUNCTION "authz"."is_system_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "authz"."on_member_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "authz"."on_role_permission_change"() TO "service_role";




















































































































































































GRANT ALL ON TABLE "private"."security_alerts" TO "service_role";



GRANT ALL ON FUNCTION "private"."acknowledge_security_alert"("p_alert_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "private"."apply_risk_event"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "private"."auth_sessions" TO "service_role";
GRANT SELECT ON TABLE "private"."auth_sessions" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "private"."bind_auth_session"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") TO "service_role";



GRANT ALL ON FUNCTION "private"."capture_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "private"."cleanup_auth_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "private"."create_monthly_partitions"() TO "service_role";



GRANT ALL ON FUNCTION "private"."create_security_alerts"() TO "service_role";



GRANT ALL ON FUNCTION "private"."decay_risk_scores"() TO "service_role";



GRANT ALL ON FUNCTION "private"."handle_token_refresh"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "private"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "private"."notify_security_alert"() TO "service_role";



GRANT ALL ON FUNCTION "private"."revoke_user_sessions"("p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "private"."touch_auth_session"("p_session_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."_lt_q_regex"("public"."ltree"[], "public"."lquery"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_lt_q_regex"("public"."ltree"[], "public"."lquery"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_lt_q_regex"("public"."ltree"[], "public"."lquery"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_lt_q_regex"("public"."ltree"[], "public"."lquery"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."_lt_q_rregex"("public"."lquery"[], "public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_lt_q_rregex"("public"."lquery"[], "public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_lt_q_rregex"("public"."lquery"[], "public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_lt_q_rregex"("public"."lquery"[], "public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltq_extract_regex"("public"."ltree"[], "public"."lquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltq_extract_regex"("public"."ltree"[], "public"."lquery") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltq_extract_regex"("public"."ltree"[], "public"."lquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltq_extract_regex"("public"."ltree"[], "public"."lquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltq_regex"("public"."ltree"[], "public"."lquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltq_regex"("public"."ltree"[], "public"."lquery") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltq_regex"("public"."ltree"[], "public"."lquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltq_regex"("public"."ltree"[], "public"."lquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltq_rregex"("public"."lquery", "public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltq_rregex"("public"."lquery", "public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_ltq_rregex"("public"."lquery", "public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltq_rregex"("public"."lquery", "public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_consistent"("internal", "public"."ltree"[], smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_consistent"("internal", "public"."ltree"[], smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_consistent"("internal", "public"."ltree"[], smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_consistent"("internal", "public"."ltree"[], smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_extract_isparent"("public"."ltree"[], "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_extract_isparent"("public"."ltree"[], "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_extract_isparent"("public"."ltree"[], "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_extract_isparent"("public"."ltree"[], "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_extract_risparent"("public"."ltree"[], "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_extract_risparent"("public"."ltree"[], "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_extract_risparent"("public"."ltree"[], "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_extract_risparent"("public"."ltree"[], "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_gist_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_gist_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_gist_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_gist_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_isparent"("public"."ltree"[], "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_isparent"("public"."ltree"[], "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_isparent"("public"."ltree"[], "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_isparent"("public"."ltree"[], "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_r_isparent"("public"."ltree", "public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_r_isparent"("public"."ltree", "public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_r_isparent"("public"."ltree", "public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_r_isparent"("public"."ltree", "public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_r_risparent"("public"."ltree", "public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_r_risparent"("public"."ltree", "public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_r_risparent"("public"."ltree", "public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_r_risparent"("public"."ltree", "public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_risparent"("public"."ltree"[], "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_risparent"("public"."ltree"[], "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_risparent"("public"."ltree"[], "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_risparent"("public"."ltree"[], "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltree_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltree_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltree_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltree_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltxtq_exec"("public"."ltree"[], "public"."ltxtquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltxtq_exec"("public"."ltree"[], "public"."ltxtquery") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltxtq_exec"("public"."ltree"[], "public"."ltxtquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltxtq_exec"("public"."ltree"[], "public"."ltxtquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltxtq_extract_exec"("public"."ltree"[], "public"."ltxtquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltxtq_extract_exec"("public"."ltree"[], "public"."ltxtquery") TO "anon";
GRANT ALL ON FUNCTION "public"."_ltxtq_extract_exec"("public"."ltree"[], "public"."ltxtquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltxtq_extract_exec"("public"."ltree"[], "public"."ltxtquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."_ltxtq_rexec"("public"."ltxtquery", "public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."_ltxtq_rexec"("public"."ltxtquery", "public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."_ltxtq_rexec"("public"."ltxtquery", "public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ltxtq_rexec"("public"."ltxtquery", "public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_risk_event_service"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_risk_event_service"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_risk_event_service"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bind_auth_session_service"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bind_auth_session_service"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bind_auth_session_service"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_refresh_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "inet", "p_user_agent" "text", "p_device_fingerprint" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_permission_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_permission_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_permission_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."client_policy_ok"("p_client_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."client_policy_ok"("p_client_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_policy_ok"("p_client_id" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."client_schedules_clear_other_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."client_schedules_clear_other_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_schedules_clear_other_defaults"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clients_set_tenant_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."clients_set_tenant_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clients_set_tenant_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_schedule_item_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_schedule_item_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_schedule_item_path"() TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid", "p_members_by_slug" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid", "p_members_by_slug" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid", "p_members_by_slug" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_project_with_relations"("p_name" "text", "p_code" "text", "p_status" "text", "p_meta" "jsonb", "p_schedule_source_id" "uuid", "p_members_by_slug" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."default_platform_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_platform_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_platform_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_basic_rate_distinct_units"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_basic_rate_distinct_units"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_basic_rate_distinct_units"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_basic_rate_distinct_units"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schedule_tree_children"("p_schedule_source_version_id" "uuid", "p_parent_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schedule_tree_roots"("p_schedule_source_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_token_refresh_service"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_token_refresh_service"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_token_refresh_service"("p_session_id" "uuid", "p_incoming_token_hash" "text", "p_new_token_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_ltree"("public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_ltree"("public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_ltree"("public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_ltree"("public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_ltree_extended"("public"."ltree", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."hash_ltree_extended"("public"."ltree", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."hash_ltree_extended"("public"."ltree", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_ltree_extended"("public"."ltree", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."index"("public"."ltree", "public"."ltree", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lca"("public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_clients"("p_search" "text", "p_status" "text"[], "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_clients"("p_search" "text", "p_status" "text"[], "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_clients"("p_search" "text", "p_status" "text"[], "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."list_my_switchable_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_my_switchable_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_my_switchable_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_projects"("p_search" "text", "p_status" "text"[], "p_dos_from" "date", "p_dos_to" "date", "p_doc_from" "date", "p_doc_to" "date", "p_amount_min" numeric, "p_amount_max" numeric, "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_projects"("p_search" "text", "p_status" "text"[], "p_dos_from" "date", "p_dos_to" "date", "p_doc_from" "date", "p_doc_to" "date", "p_amount_min" numeric, "p_amount_max" numeric, "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_projects"("p_search" "text", "p_status" "text"[], "p_dos_from" "date", "p_dos_to" "date", "p_doc_from" "date", "p_doc_to" "date", "p_amount_min" numeric, "p_amount_max" numeric, "p_sort_by" "text", "p_sort_dir" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event_service"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event_service"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event_service"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_ip_address" "inet", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."lt_q_regex"("public"."ltree", "public"."lquery"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."lt_q_regex"("public"."ltree", "public"."lquery"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."lt_q_regex"("public"."ltree", "public"."lquery"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lt_q_regex"("public"."ltree", "public"."lquery"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."lt_q_rregex"("public"."lquery"[], "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."lt_q_rregex"("public"."lquery"[], "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."lt_q_rregex"("public"."lquery"[], "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lt_q_rregex"("public"."lquery"[], "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltq_regex"("public"."ltree", "public"."lquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltq_regex"("public"."ltree", "public"."lquery") TO "anon";
GRANT ALL ON FUNCTION "public"."ltq_regex"("public"."ltree", "public"."lquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltq_regex"("public"."ltree", "public"."lquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltq_rregex"("public"."lquery", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltq_rregex"("public"."lquery", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltq_rregex"("public"."lquery", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltq_rregex"("public"."lquery", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree2text"("public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree2text"("public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree2text"("public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree2text"("public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_addltree"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_addltree"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_addltree"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_addltree"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_addtext"("public"."ltree", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_addtext"("public"."ltree", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_addtext"("public"."ltree", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_addtext"("public"."ltree", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_cmp"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_cmp"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_cmp"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_cmp"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_consistent"("internal", "public"."ltree", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_consistent"("internal", "public"."ltree", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_consistent"("internal", "public"."ltree", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_consistent"("internal", "public"."ltree", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_eq"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_eq"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_eq"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_eq"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_ge"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_ge"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_ge"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_ge"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_gist_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_gist_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_gist_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_gist_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_gt"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_gt"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_gt"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_gt"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_isparent"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_isparent"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_isparent"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_isparent"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_le"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_le"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_le"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_le"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_lt"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_lt"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_lt"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_lt"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_ne"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_ne"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_ne"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_ne"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_risparent"("public"."ltree", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_risparent"("public"."ltree", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_risparent"("public"."ltree", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_risparent"("public"."ltree", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_same"("public"."ltree_gist", "public"."ltree_gist", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_textadd"("text", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_textadd"("text", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_textadd"("text", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_textadd"("text", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltree_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltree_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ltree_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltree_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltreeparentsel"("internal", "oid", "internal", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."ltreeparentsel"("internal", "oid", "internal", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."ltreeparentsel"("internal", "oid", "internal", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltreeparentsel"("internal", "oid", "internal", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_exec"("public"."ltree", "public"."ltxtquery") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_exec"("public"."ltree", "public"."ltxtquery") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_exec"("public"."ltree", "public"."ltxtquery") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_exec"("public"."ltree", "public"."ltxtquery") TO "service_role";



GRANT ALL ON FUNCTION "public"."ltxtq_rexec"("public"."ltxtquery", "public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."ltxtq_rexec"("public"."ltxtquery", "public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."ltxtq_rexec"("public"."ltxtquery", "public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ltxtq_rexec"("public"."ltxtquery", "public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_security_alert_status"("p_alert_id" "uuid", "p_status" "text", "p_recipient" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_security_alert_status"("p_alert_id" "uuid", "p_status" "text", "p_recipient" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_security_alert_status"("p_alert_id" "uuid", "p_status" "text", "p_recipient" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."nlevel"("public"."ltree") TO "postgres";
GRANT ALL ON FUNCTION "public"."nlevel"("public"."ltree") TO "anon";
GRANT ALL ON FUNCTION "public"."nlevel"("public"."ltree") TO "authenticated";
GRANT ALL ON FUNCTION "public"."nlevel"("public"."ltree") TO "service_role";



GRANT ALL ON FUNCTION "public"."project_members_enforce_role_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."project_members_enforce_role_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."project_members_enforce_role_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."project_policy_ok"("p_project_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."project_policy_ok"("p_project_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."project_policy_ok"("p_project_id" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."project_schedules_clear_other_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."project_schedules_clear_other_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."project_schedules_clear_other_defaults"() TO "service_role";



GRANT ALL ON FUNCTION "public"."projects_set_tenant_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."projects_set_tenant_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."projects_set_tenant_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_system_admin_flag"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_system_admin_flag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_system_admin_flag"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_user_sessions_service"("p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_user_sessions_service"("p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_user_sessions_service"("p_user_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug"("p_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_item_path_slug_sort_key"("p_path_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_schedule_tree"("p_schedule_source_version_id" "uuid", "p_query" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_client_schedule"("p_client_id" "uuid", "p_schedule_source_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_client_schedule"("p_client_id" "uuid", "p_schedule_source_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_client_schedule"("p_client_id" "uuid", "p_schedule_source_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_project_schedule"("p_project_id" "uuid", "p_schedule_source_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_project_schedule"("p_project_id" "uuid", "p_schedule_source_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_project_schedule"("p_project_id" "uuid", "p_schedule_source_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subltree"("public"."ltree", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subltree"("public"."ltree", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subltree"("public"."ltree", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subltree"("public"."ltree", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subpath"("public"."ltree", integer, integer) TO "service_role";



GRANT ALL ON TABLE "public"."tenant_members" TO "anon";
GRANT ALL ON TABLE "public"."tenant_members" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_members" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."tenant_members" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."switch_active_role"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_role_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_active_role"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_role_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_active_role"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_role_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_tenant_member_roles"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_role_slugs" "text"[], "p_active_role_slug" "text", "p_display_name" "text", "p_avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenant_member_roles"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_role_slugs" "text"[], "p_active_role_slug" "text", "p_display_name" "text", "p_avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenant_member_roles"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_role_slugs" "text"[], "p_active_role_slug" "text", "p_display_name" "text", "p_avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."text2ltree"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text2ltree"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."text2ltree"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text2ltree"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_auth_session_service"("p_session_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."touch_auth_session_service"("p_session_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_auth_session_service"("p_session_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."uuid_to_short_id"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."uuid_to_short_id"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."uuid_to_short_id"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."clear_auth_context"() TO "authenticated";



GRANT ALL ON FUNCTION "tests"."set_auth_context"("p_user_id" "uuid", "p_tenant_id" "uuid", "p_active_role" "text", "p_pv" integer, "p_is_system_admin" boolean, "p_is_locked" boolean, "p_session_revoked" boolean) TO "authenticated";












GRANT ALL ON TABLE "authz"."permissions" TO "service_role";



GRANT ALL ON TABLE "authz"."role_template_permissions" TO "service_role";



GRANT ALL ON TABLE "authz"."role_templates" TO "service_role";



GRANT ALL ON TABLE "authz"."tenant_member_roles" TO "service_role";
GRANT SELECT ON TABLE "authz"."tenant_member_roles" TO "supabase_auth_admin";
GRANT SELECT,INSERT,DELETE ON TABLE "authz"."tenant_member_roles" TO "authenticated";



GRANT ALL ON TABLE "authz"."tenant_role_permissions" TO "service_role";



GRANT ALL ON TABLE "authz"."tenant_roles" TO "service_role";
GRANT SELECT ON TABLE "authz"."tenant_roles" TO "supabase_auth_admin";
GRANT SELECT ON TABLE "authz"."tenant_roles" TO "authenticated";















GRANT ALL ON TABLE "private"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "private"."audit_logs_2026_04" TO "service_role";



GRANT ALL ON TABLE "private"."audit_logs_2026_05" TO "service_role";



GRANT ALL ON TABLE "private"."audit_logs_2026_06" TO "service_role";



GRANT ALL ON TABLE "private"."audit_logs_default" TO "service_role";



GRANT ALL ON TABLE "private"."security_events" TO "service_role";



GRANT ALL ON TABLE "private"."security_events_2026_04" TO "service_role";



GRANT ALL ON TABLE "private"."security_events_2026_05" TO "service_role";



GRANT ALL ON TABLE "private"."security_events_2026_06" TO "service_role";



GRANT ALL ON TABLE "private"."security_events_default" TO "service_role";



GRANT ALL ON TABLE "private"."user_risk_scores" TO "service_role";
GRANT SELECT ON TABLE "private"."user_risk_scores" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."attribute_values" TO "anon";
GRANT ALL ON TABLE "public"."attribute_values" TO "authenticated";
GRANT ALL ON TABLE "public"."attribute_values" TO "service_role";



GRANT ALL ON TABLE "public"."attributes" TO "anon";
GRANT ALL ON TABLE "public"."attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."attributes" TO "service_role";



GRANT ALL ON TABLE "public"."basic_rate_annotations" TO "anon";
GRANT ALL ON TABLE "public"."basic_rate_annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."basic_rate_annotations" TO "service_role";



GRANT ALL ON TABLE "public"."basic_rate_types" TO "anon";
GRANT ALL ON TABLE "public"."basic_rate_types" TO "authenticated";
GRANT ALL ON TABLE "public"."basic_rate_types" TO "service_role";



GRANT ALL ON TABLE "public"."basic_rates" TO "anon";
GRANT ALL ON TABLE "public"."basic_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."basic_rates" TO "service_role";



GRANT ALL ON TABLE "public"."client_schedules" TO "anon";
GRANT ALL ON TABLE "public"."client_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."client_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."derived_units" TO "anon";
GRANT ALL ON TABLE "public"."derived_units" TO "authenticated";
GRANT ALL ON TABLE "public"."derived_units" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."project_schedules" TO "anon";
GRANT ALL ON TABLE "public"."project_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."project_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_item_annotations" TO "anon";
GRANT ALL ON TABLE "public"."schedule_item_annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_item_annotations" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_item_attributes" TO "anon";
GRANT ALL ON TABLE "public"."schedule_item_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_item_attributes" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_item_rates" TO "anon";
GRANT ALL ON TABLE "public"."schedule_item_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_item_rates" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_source_versions" TO "anon";
GRANT ALL ON TABLE "public"."schedule_source_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_source_versions" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_sources" TO "anon";
GRANT ALL ON TABLE "public"."schedule_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_sources" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items_tree" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items_tree" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items_tree" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "authz" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "authz" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "authz" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "private" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "private" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "private" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_profile"();



