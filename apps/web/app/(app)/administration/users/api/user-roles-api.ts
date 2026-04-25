import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

/** Assigned-role slice of `authz.tenant_roles` (same names as DB / codegen). */
export type UserRoleRow = Pick<
  Database['authz']['Tables']['tenant_roles']['Row'],
  'id' | 'name' | 'slug' | 'is_system'
>;

async function fetchUserRolesForMember(
  supabase: SupabaseClient<Database>,
  tenantMemberId: string,
  signal?: AbortSignal
): Promise<UserRoleRow[]> {
  let q = supabase
    .schema('authz')
    .from('tenant_member_roles')
    .select('tenant_role_id, tenant_roles(id, name, slug, is_system)')
    .eq('tenant_member_id', tenantMemberId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  const rows: UserRoleRow[] = [];
  for (const row of data ?? []) {
    const r = row as {
      tenant_role_id: string;
      tenant_roles: UserRoleRow | null;
    };
    const role = r.tenant_roles;
    if (!role) {
      continue;
    }
    rows.push(role);
  }
  return rows;
}

export { fetchUserRolesForMember };
