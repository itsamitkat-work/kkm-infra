/**
 * Supabase access-token JWT payload: standard fields plus claims from
 * public.custom_access_token_hook (see supabase/functions/_shared/runtime.ts).
 */
export interface AccessTokenClaims {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  session_id?: string;
  /** Hook: Supabase session row id */
  sid?: string | null;
  /** Hook: active tenant */
  tid?: string | null;
  active_role?: string | null;
  roles?: string[];
  /** Present only if your issuer adds them; hook does not embed perms. */
  permissions?: string[];
  pv?: number;
  is_system_admin?: boolean;
  is_locked?: boolean;
  session_revoked?: boolean;
  [key: string]: unknown;
}

export interface ComposedAccessTokenContext {
  claims: AccessTokenClaims | null;
  permissions: string[];
  roles: string[];
}
