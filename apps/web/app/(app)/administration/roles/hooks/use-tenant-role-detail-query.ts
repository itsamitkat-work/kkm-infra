'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchTenantRoleDetail } from '../api/tenant-roles-api';

import { TENANT_ROLES_QUERY_KEY_PREFIX } from './use-tenant-roles-query';

function useTenantRoleDetailQuery(roleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...TENANT_ROLES_QUERY_KEY_PREFIX, 'detail', roleId],
    queryFn: ({ signal }) => {
      if (!roleId) {
        return Promise.reject(new Error('Role id is required'));
      }
      return fetchTenantRoleDetail(createSupabaseBrowserClient(), roleId, signal);
    },
    enabled: Boolean(roleId) && enabled,
    staleTime: 0,
  });
}

export { useTenantRoleDetailQuery };
