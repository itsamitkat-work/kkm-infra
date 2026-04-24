import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

export const TENANT_ROLES_ADMIN_QUERY_KEY = 'tenant-roles-admin' as const;

/** Columns loaded for the tenant roles picker (matches `select(...)`). */
export type TenantRolesAdminRow = Pick<
  Database['authz']['Tables']['tenant_roles']['Row'],
  'id' | 'name' | 'slug' | 'is_system'
>;

async function fetchTenantRolesAdmin(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  signal?: AbortSignal
): Promise<TenantRolesAdminRow[]> {
  let q = supabase
    .schema('authz')
    .from('tenant_roles')
    .select('id, name, slug, is_system')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  return data ?? [];
}

export { fetchTenantRolesAdmin };
