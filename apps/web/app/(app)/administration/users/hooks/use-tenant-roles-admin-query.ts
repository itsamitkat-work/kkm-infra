'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchTenantRolesAdmin,
  TENANT_ROLES_ADMIN_QUERY_KEY,
  type TenantRolesAdminRow,
} from '../api/tenant-roles-admin-api';

function useTenantRolesAdminQuery(tenantId: string | null) {
  return useQuery({
    queryKey: [TENANT_ROLES_ADMIN_QUERY_KEY, tenantId],
    queryFn: ({ signal }) => {
      if (!tenantId) {
        return Promise.resolve([]);
      }
      return fetchTenantRolesAdmin(
        createSupabaseBrowserClient(),
        tenantId,
        signal
      );
    },
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });
}

export { TENANT_ROLES_ADMIN_QUERY_KEY, useTenantRolesAdminQuery };

export type { TenantRolesAdminRow };
