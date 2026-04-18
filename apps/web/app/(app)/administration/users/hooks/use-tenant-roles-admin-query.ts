'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Role } from '@/types/roles';

export const TENANT_ROLES_ADMIN_QUERY_KEY = 'tenant-roles-admin';

export function useTenantRolesAdminQuery(tenantId: string | null) {
  return useQuery({
    queryKey: [TENANT_ROLES_ADMIN_QUERY_KEY, tenantId],
    queryFn: async (): Promise<Role[]> => {
      if (!tenantId) {
        return [];
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .schema('authz')
        .from('roles')
        .select('id, name, slug, is_system')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []).map((r) => ({
        id: r.id,
        code: r.slug,
        name: r.name,
        isSystemRole: r.is_system,
        isActive: true,
      }));
    },
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });
}
