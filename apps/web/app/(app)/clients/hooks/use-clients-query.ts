'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import type { Filter } from '@/components/ui/filters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchClients,
  type ClientsListParams,
} from '../api/client-api';

const CLIENTS_QUERY_KEY_PREFIX = ['clients'] as const;

const CLIENTS_TABLE_ID = 'clients' as const;

function clientsListQueryKey(listParams: ClientsListParams) {
  return [...CLIENTS_QUERY_KEY_PREFIX, 'list', listParams] as const;
}

function invalidateClientsQueryCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: [...CLIENTS_QUERY_KEY_PREFIX],
  });
}

function buildClientsListParamsFromFilters(
  filters: Filter[]
): Pick<ClientsListParams, 'status'> {
  const out: Pick<ClientsListParams, 'status'> = {};
  for (const f of filters) {
    if (f.field === 'status' && f.values.length > 0) {
      out.status = f.values.map(String);
    }
  }
  return out;
}

function useClientsQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ClientsListParams = React.useMemo(() => {
    const fromFilters = buildClientsListParamsFromFilters(params.filters);
    const out: ClientsListParams = {
      search: params.search,
      ...fromFilters,
    };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: clientsListQueryKey(listParams),
    queryFn: ({ pageParam = 1, signal }) =>
      fetchClients(
        createSupabaseBrowserClient(),
        {
          ...listParams,
          page: pageParam as number,
          pageSize: 20,
        },
        signal
      ),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'list'],
      }),
  };
}

export {
  CLIENTS_QUERY_KEY_PREFIX,
  CLIENTS_TABLE_ID,
  buildClientsListParamsFromFilters,
  invalidateClientsQueryCache,
  useClientsQuery,
};
