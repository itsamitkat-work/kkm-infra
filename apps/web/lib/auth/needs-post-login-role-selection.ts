import type { AccessTokenClaims } from '@/types/jwt-claims';

/**
 * When a tenant member has more than one assigned role but no persisted
 * `active_role_id`, the custom access token hook leaves `active_role` null
 * (it only infers a role in-JWT when exactly one role is assigned).
 * The user must call `switch-role` before using the app. See `supabase/plans/auth.md`.
 */
export function needsPostLoginRoleSelection(
  claims: AccessTokenClaims | null,
  roleSlugs: readonly string[],
): boolean {
  const roles = roleSlugs.filter(
    (slug) => typeof slug === 'string' && slug.trim().length > 0,
  );
  if (roles.length <= 1) {
    return false;
  }
  const active = claims?.active_role;
  if (typeof active !== 'string' || active.trim().length === 0) {
    return true;
  }
  return !roles.includes(active);
}
