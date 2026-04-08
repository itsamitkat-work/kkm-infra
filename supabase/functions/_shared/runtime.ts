/**
 * Shared runtime utilities for all Supabase Edge Functions.
 *
 * Provides: authentication middleware, CORS handling, rate limiting,
 * JWT parsing, user lookup, security event logging, and error handling.
 *
 * Environment variables:
 *   SUPABASE_URL            – Supabase project URL
 *   SUPABASE_ANON_KEY       – Public anon key (used for user-scoped clients)
 *   SUPABASE_SERVICE_ROLE_KEY – Service role key (bypasses RLS)
 *   UPSTASH_REDIS_REST_URL  – Upstash Redis REST endpoint (rate limiting)
 *   UPSTASH_REDIS_REST_TOKEN – Upstash Redis auth token
 *   ALLOWED_ORIGINS         – Comma-separated list of allowed CORS origins
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const upstashUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
const upstashToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

/**
 * CORS origin allowlist parsed from ALLOWED_ORIGINS env var.
 * When empty (local dev), the request Origin is reflected back.
 */
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Resolve the correct Access-Control-Allow-Origin for a given request. */
export function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  if (allowedOrigins.length === 0) return origin || "*";
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

/** Default CORS headers applied to every response. */
export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins[0] ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * JWT claims embedded by the custom_access_token_hook.
 * Kept minimal to avoid token bloat (~8KB header limit).
 * Permissions are NOT in the JWT — resolved at DB level by authz.has_permission().
 */
export interface JwtClaims {
  sub?: string;
  /** Supabase session ID (from auth.sessions) */
  sid?: string;
  /** Active tenant ID bound to this session */
  tid?: string | null;
  /** Supabase built-in role (always "authenticated") */
  role?: string;
  /** Tenant-scoped active role slug (e.g. "tenant_admin") */
  active_role?: string | null;
  /** All role slugs assigned to the user in the active tenant */
  roles?: string[];
  /** Permission version — compared against DB to detect stale JWTs */
  pv?: number;
  /** True if the user's profile.is_system_admin is set */
  is_system_admin?: boolean;
  /** True if the user's risk score triggered an account lock */
  is_locked?: boolean;
  /** True if the session was revoked (e.g. by risk escalation) */
  session_revoked?: boolean;
}

/**
 * Authenticated request context returned by requireUserContext().
 * Available to every Edge Function handler after the middleware check.
 */
export interface RequestContext {
  authHeader: string;
  accessToken: string;
  claims: JwtClaims;
  user: User;
  /** Client scoped to the calling user's JWT (respects RLS) */
  userClient: SupabaseClient;
  /** Service-role client that bypasses RLS — use with care */
  serviceClient: SupabaseClient;
  ipAddress: string | null;
  userAgent: string | null;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Build a JSON response with proper CORS headers. */
export function jsonResponse(body: unknown, status = 200, req?: Request) {
  const origin = req ? getCorsOrigin(req) : (allowedOrigins[0] ?? "*");
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin": origin,
      "Content-Type": "application/json",
    },
  });
}

/** Handle CORS preflight requests (OPTIONS → 204 No Content). */
export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": getCorsOrigin(req),
      },
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Supabase client factories
// ---------------------------------------------------------------------------

/** Create a service-role client (bypasses RLS). */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Create a client scoped to the calling user's JWT. */
export function createUserClient(authHeader: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------------------

/**
 * Decode JWT claims from the access token payload (base64url).
 * This does NOT verify the signature — actual auth is handled by
 * getUser() in requireUserContext(). This is a pre-parse for
 * reading middleware-relevant flags (is_locked, session_revoked).
 */
export function parseJwtClaims(token: string): JwtClaims {
  const [, payload = ""] = token.split(".");
  if (!payload) return {};

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));
    const decoded = atob(normalized + padding);
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    throw new HttpError(401, "Invalid token");
  }
}

/**
 * Central authentication middleware for all Edge Functions.
 *
 * Pipeline:
 *   1. Extract and decode the Bearer token
 *   2. Verify the token server-side via getUser()
 *   3. Reject locked accounts (from JWT is_locked claim)
 *   4. Reject revoked sessions (from JWT session_revoked claim)
 *
 * Callers receive a RequestContext with both user-scoped and
 * service-role Supabase clients.
 */
export async function requireUserContext(req: Request): Promise<RequestContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const claims = parseJwtClaims(accessToken);
  const userClient = createUserClient(authHeader);
  const serviceClient = createServiceClient();
  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new HttpError(401, "Invalid session");
  }

  if (claims.is_locked === true) {
    throw new HttpError(403, "Account is locked");
  }

  if (claims.session_revoked === true) {
    throw new HttpError(401, "Session has been revoked");
  }

  return {
    authHeader,
    accessToken,
    claims,
    user: data.user,
    userClient,
    serviceClient,
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  };
}

// ---------------------------------------------------------------------------
// Claim accessors
// ---------------------------------------------------------------------------

export function getCurrentSessionId(claims: JwtClaims) {
  return claims.sid ?? null;
}

export function getCurrentTenantId(claims: JwtClaims) {
  return claims.tid ?? null;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/** Parse and validate the JSON body, returning 400 on malformed input. */
export async function requireJsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** SHA-256 hash a string and return the hex digest. */
export async function hashValue(value: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Exchange a refresh token for a new session via the Supabase Auth API.
 * Returns null if no refresh token is provided (caller should treat this
 * as "session refresh required on client side").
 */
export async function maybeRefreshSession(refreshToken?: string | null) {
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(401, `Failed to refresh session: ${text}`);
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/** Endpoint sensitivity for hybrid fallback when Redis is unavailable. */
export type RateLimitMode = "strict" | "moderate" | "relaxed";

/**
 * In-memory sliding window fallback. Per-isolate only — each Deno isolate
 * has its own counters. Provides best-effort protection when Redis is down.
 */
const memoryBuckets = new Map<string, number[]>();

function inMemoryCheck(bucket: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  let entries = memoryBuckets.get(bucket);

  if (!entries) {
    entries = [];
    memoryBuckets.set(bucket, entries);
  }

  while (entries.length > 0 && entries[0] <= cutoff) entries.shift();
  entries.push(now);
  return entries.length <= limit;
}

/**
 * Sliding-window rate limiter backed by Upstash Redis sorted sets.
 *
 * Hybrid fallback strategy (when Redis is unavailable):
 *   strict   – fail closed (block). Use for auth/login/session endpoints.
 *   moderate – fall back to in-memory limiter + log. Use for mutations.
 *   relaxed  – allow + log. Use for read-only endpoints.
 */
export async function applyRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
  mode: RateLimitMode = "strict",
) {
  const windowMs = windowSeconds * 1000;

  if (!upstashUrl || !upstashToken) {
    console.warn(`Rate limiting unconfigured — fallback mode: ${mode}`);
    return rateLimitFallback(bucket, limit, windowMs, windowSeconds, mode);
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}:${crypto.randomUUID().slice(0, 8)}`;
  const redisKey = `rate:sw:${bucket}`;

  try {
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", redisKey, 0, windowStart],
        ["ZADD", redisKey, now, member],
        ["ZCARD", redisKey],
        ["EXPIRE", redisKey, windowSeconds],
      ]),
    });

    if (!response.ok) {
      console.error(`Rate limit backend error: ${response.status}`);
      return rateLimitFallback(bucket, limit, windowMs, windowSeconds, mode);
    }

    const data = await response.json();
    const currentCount = Number(data?.[2]?.result ?? 0);
    return {
      allowed: currentCount <= limit,
      retryAfter: currentCount <= limit ? null : windowSeconds as number | null,
    };
  } catch (err) {
    console.error("Rate limit request failed:", err);
    return rateLimitFallback(bucket, limit, windowMs, windowSeconds, mode);
  }
}

function rateLimitFallback(
  bucket: string,
  limit: number,
  windowMs: number,
  windowSeconds: number,
  mode: RateLimitMode,
): { allowed: boolean; retryAfter: number | null } {
  switch (mode) {
    case "strict":
      return { allowed: false, retryAfter: windowSeconds };
    case "moderate":
      return {
        allowed: inMemoryCheck(bucket, limit, windowMs),
        retryAfter: null,
      };
    case "relaxed":
      return { allowed: true, retryAfter: null };
  }
}

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

/**
 * Search for an existing auth user by email via the Admin API.
 * Paginates through users (max 1,000) since the Supabase JS SDK
 * does not expose a direct getUserByEmail() method.
 *
 * Limitation: returns null if the user exists beyond page 10 (1,000 users).
 * At scale, replace with a direct DB query against auth.users.
 */
export async function findUserByEmail(serviceClient: SupabaseClient, email: string) {
  let page = 1;

  while (page <= 10) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const existingUser = data.users.find((user) => user.email === email);
    if (existingUser) return existingUser;

    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Security event helpers
// ---------------------------------------------------------------------------

/** Log a security event via the service-role RPC wrapper. */
export async function logSecurityEvent(
  serviceClient: SupabaseClient,
  params: {
    eventType: string;
    severity: "low" | "medium" | "high" | "critical";
    userId?: string | null;
    tenantId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await serviceClient.rpc("log_security_event_service", {
    p_event_type: params.eventType,
    p_severity: params.severity,
    p_user_id: params.userId ?? null,
    p_tenant_id: params.tenantId ?? null,
    p_ip_address: params.ipAddress ?? null,
    p_metadata: params.metadata ?? {},
  });
}

/**
 * Record a risk event and update the user's risk score.
 * May trigger session revocation (score >= 20) or account lock (score >= 30).
 */
export async function applyRiskEvent(
  serviceClient: SupabaseClient,
  params: {
    eventType: string;
    userId: string;
    tenantId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await serviceClient.rpc("apply_risk_event_service", {
    p_event_type: params.eventType,
    p_user_id: params.userId,
    p_tenant_id: params.tenantId ?? null,
    p_ip_address: params.ipAddress ?? null,
    p_metadata: params.metadata ?? {},
  });
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/** HTTP-aware error with a status code for structured error responses. */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Convert any thrown error into a JSON response with proper status. */
export function handleError(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  console.error(error);
  return jsonResponse({ error: "Internal server error" }, 500);
}
