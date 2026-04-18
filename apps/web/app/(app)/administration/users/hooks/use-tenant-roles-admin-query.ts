'use client';

import { useQuery } from '@tanstack/react-query';
import type { Database } from '@kkm/db';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const TENANT_ROLES_ADMIN_QUERY_KEY = 'tenant-roles-admin';

/** Columns loaded for the tenant roles picker (matches `select(...)`). */
export type TenantRolesAdminRow = Pick<
  Database['authz']['Tables']['tenant_roles']['Row'],
  'id' | 'name' | 'slug' | 'is_system'
>;

export function useTenantRolesAdminQuery(tenantId: string | null) {
  return useQuery({
    queryKey: [TENANT_ROLES_ADMIN_QUERY_KEY, tenantId],
    queryFn: async (): Promise<TenantRolesAdminRow[]> => {
      if (!tenantId) {
        return [];
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .schema('authz')
        .from('tenant_roles')
        .select('id, name, slug, is_system')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });
}
