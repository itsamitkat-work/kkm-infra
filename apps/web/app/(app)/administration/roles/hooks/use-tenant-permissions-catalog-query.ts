'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchPermissionsCatalog } from '../api/tenant-roles-api';

import { TENANT_ROLES_QUERY_KEY_PREFIX } from './use-tenant-roles-query';

function useTenantPermissionsCatalogQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: [...TENANT_ROLES_QUERY_KEY_PREFIX, 'permissions-catalog'],
    queryFn: ({ signal }) =>
      fetchPermissionsCatalog(createSupabaseBrowserClient(), signal),
    staleTime: 120_000,
    enabled,
  });
}

export { useTenantPermissionsCatalogQuery };
