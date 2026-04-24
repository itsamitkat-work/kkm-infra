import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  EdgeFunctionRateLimitedError,
  invokeEdgeFunction,
} from '@/lib/supabase/invoke-edge-function';

export type SwitchRoleFnResponse = {
  active_role?: string;
  session_refresh_required?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
  error?: string;
};

export function formatRoleSlugForDisplay(slug: string): string {
  const spaced = slug.replace(/_/g, ' ');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getDistinctSortedRoleSlugs(
  roleSlugs: readonly string[],
): string[] {
  const unique = new Set<string>();
  for (const raw of roleSlugs) {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      unique.add(trimmed);
    }
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/**
 * Calls the `switch-role` Edge Function and applies the returned session
 * (or refreshes) so JWT `active_role` updates. Throws on failure.
 */
export async function switchActiveRole(roleSlug: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const refreshToken = session?.refresh_token;
  if (!refreshToken) {
    throw new Error('Session is missing; sign in again.');
  }
  const { data: invokeData, error } = await invokeEdgeFunction(
    supabase,
    'switch-role',
    {
      body: { role_slug: roleSlug, refresh_token: refreshToken },
    },
  );
  const data = invokeData as SwitchRoleFnResponse | null | undefined;
  if (error) {
    if (error instanceof EdgeFunctionRateLimitedError) {
      throw error;
    }
    throw new Error(error.message ?? 'Could not switch role');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (data?.session?.access_token && data.session.refresh_token) {
    const { error: setErr } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (setErr) {
      throw setErr;
    }
  } else if (data?.session_refresh_required) {
    const { error: refErr } = await supabase.auth.refreshSession();
    if (refErr) {
      throw refErr;
    }
  }
}
