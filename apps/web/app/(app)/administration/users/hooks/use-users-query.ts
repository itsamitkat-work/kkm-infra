'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import type { Filter } from '@/components/ui/filters';
import { useAuth } from '@/hooks/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchTenantUsers,
  type FetchTenantUsersParams,
} from '../api/tenant-users-api';

export const USERS_TABLE_ID = 'users' as const;

type UseUsersQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

function useUsersQuery({ search, filters, sorting }: UseUsersQueryParams) {
  void filters;
  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;
  const debouncedSearch = useDebounce(search, 400);

  const listParams = React.useMemo(
    () => ({
      tenantId: tenantId ?? '',
      search: debouncedSearch,
      sorting,
    }),
    [tenantId, debouncedSearch, sorting]
  );

  const query = useInfiniteQuery({
    queryKey: [USERS_TABLE_ID, listParams],
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
      return fetchTenantUsers(
        createSupabaseBrowserClient(),
        {
          tenantId,
          search: debouncedSearch,
          page: pageParam as number,
          pageSize: 20,
          sorting,
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
      queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] }),
  };
}

export { useUsersQuery };

export type { FetchTenantUsersParams };
