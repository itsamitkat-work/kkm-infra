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
import type { Database } from '@kkm/db';

import { invalidateBasicRateDistinctUnitsQueries } from '@/hooks/use-basic-rate-distinct-units';

import {
  fetchBasicRates,
  type BasicRatesListParams,
} from '../api/basic-rate-api';

/** Shared prefix for all basic-rate list/search/options query keys. */
const BASIC_RATE_QUERY_KEY_PREFIX = ['basic-rate'] as const;

/** After create / update / delete, refresh list, search, type options, and distinct units. */
function invalidateBasicRateQueryCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: [...BASIC_RATE_QUERY_KEY_PREFIX],
  });
  invalidateBasicRateDistinctUnitsQueries(queryClient);
}

/** Stable id for persisted table controls (filters, column state). */
const BASIC_RATES_TABLE_ID = 'basic-rates' as const;

function basicRatesQueryKey(listParams: BasicRatesListParams) {
  return [...BASIC_RATE_QUERY_KEY_PREFIX, 'list', listParams] as const;
}

function useBasicRatesQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: BasicRatesListParams = React.useMemo(() => {
    const out: BasicRatesListParams = { search: params.search };
    params.filters.forEach((filter) => {
      if (filter.field === 'types' && filter.values.length > 0) {
        out.types = filter.values[0] as string;
      }
      if (
        filter.field === 'schedule_source_version_id' &&
        filter.values.length > 0
      ) {
        out.schedule_source_version_id = String(filter.values[0]);
      }
      if (
        filter.field === 'status' &&
        filter.values.length > 0 &&
        (filter.operator === 'is_any_of' || filter.operator === 'is')
      ) {
        out.statusIn = filter.values.map(
          String
        ) as Database['public']['Enums']['record_status'][];
      }
    });
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: basicRatesQueryKey(listParams),
    queryFn: ({ pageParam = 1, signal }) =>
      fetchBasicRates(
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
        queryKey: [...BASIC_RATE_QUERY_KEY_PREFIX, 'list'],
      }),
  };
}

export {
  BASIC_RATE_QUERY_KEY_PREFIX,
  BASIC_RATES_TABLE_ID,
  invalidateBasicRateQueryCache,
  useBasicRatesQuery,
};
