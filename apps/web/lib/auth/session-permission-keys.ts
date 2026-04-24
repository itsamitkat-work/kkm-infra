import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';

import { composeAccessTokenContext } from './decode-access-token';

/**
 * Loads `authz.permissions.key` rows for the current JWT tenant + the caller's
 * `tenant_members.active_role_id`. System admins get an empty list (CASL uses
 * `is_system_admin` only). Does not read `claims.permissions` on the token.
 * Calls RPC `public.session_permissions()` (returns permission key strings).
 */
export async function fetchSessionPermissionKeys(
  supabase: SupabaseClient<Database>,
  accessToken: string | undefined,
): Promise<string[]> {
  if (!accessToken) {
    return [];
  }
  const { claims } = composeAccessTokenContext(accessToken);
  if (!claims) {
    return [];
  }
  if (claims.is_system_admin === true) {
    return [];
  }
  const tid = claims.tid;
  if (typeof tid !== 'string' || tid.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('session_permissions');

  if (error) {
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((k): k is string => typeof k === 'string' && k.length > 0);
}
