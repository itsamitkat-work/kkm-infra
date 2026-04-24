import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

export interface UserRoleRow {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystemRole: boolean;
}

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
      tenant_roles:
        | { id: string; name: string; slug: string; is_system: boolean }
        | null;
    };
    const role = r.tenant_roles;
    if (!role) {
      continue;
    }
    rows.push({
      roleId: role.id,
      roleCode: role.slug,
      roleName: role.name,
      isSystemRole: role.is_system,
    });
  }
  return rows;
}

export { fetchUserRolesForMember };
