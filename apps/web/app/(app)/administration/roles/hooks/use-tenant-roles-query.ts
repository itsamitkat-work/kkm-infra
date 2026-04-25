'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import type { Filter } from '@/components/ui/filters';
import { useAuth } from '@/hooks/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchTenantRoles,
  type TenantRolesListParams,
} from '../api/tenant-roles-api';

/** Shared prefix for all tenant-roles query keys (list, detail, catalog). */
const TENANT_ROLES_QUERY_KEY_PREFIX = ['tenant-roles'] as const;

/** Stable id for persisted table controls (search, sorting, column state). */
const TENANT_ROLES_TABLE_ID = 'tenant-roles' as const;

function tenantRolesListQueryKey(
  tenantId: string | null,
  listParams: Omit<TenantRolesListParams, 'tenantId' | 'page' | 'pageSize'>
) {
  return [...TENANT_ROLES_QUERY_KEY_PREFIX, 'list', tenantId, listParams] as const;
}

function invalidateTenantRolesQueryCache(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: [...TENANT_ROLES_QUERY_KEY_PREFIX],
  });
}

function useTenantRolesQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  void params.filters;

  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;
  const debouncedSearch = useDebounce(params.search, 400);

  const listParams = React.useMemo(
    () => ({
      search: debouncedSearch,
      sorting: params.sorting,
    }),
    [debouncedSearch, params.sorting]
  );

  const query = useInfiniteQuery({
    queryKey: tenantRolesListQueryKey(tenantId, listParams),
    queryFn: ({ pageParam = 1, signal }) => {
      if (!tenantId) {
        return Promise.resolve({
          data: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
          isSuccess: true,
          statusCode: 200,
          message: '',
        });
      }
      return fetchTenantRoles(
        createSupabaseBrowserClient(),
        {
          tenantId,
          search: debouncedSearch,
          page: pageParam as number,
          pageSize: 20,
          sorting: params.sorting,
        },
        signal
      );
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: 30_000,
    enabled: Boolean(tenantId),
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [...TENANT_ROLES_QUERY_KEY_PREFIX, 'list'],
      }),
  };
}

export {
  invalidateTenantRolesQueryCache,
  TENANT_ROLES_QUERY_KEY_PREFIX,
  TENANT_ROLES_TABLE_ID,
  tenantRolesListQueryKey,
  useTenantRolesQuery,
};
