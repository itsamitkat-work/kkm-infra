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
  fetchScheduleSources,
  type ScheduleSourcesListParams,
} from '../api/schedule-sources-api';

/** Stable id for persisted table controls (filters, column state). */
const SCHEDULE_SOURCES_TABLE_ID = 'schedule-sources' as const;

const SCHEDULE_SOURCES_QUERY_KEY_PREFIX = [
  SCHEDULE_SOURCES_TABLE_ID,
] as const;

function scheduleSourcesInfiniteListQueryKey(
  listParams: ScheduleSourcesListParams,
  filters: Filter[]
) {
  return [...SCHEDULE_SOURCES_QUERY_KEY_PREFIX, listParams, filters] as const;
}

function invalidateScheduleSourcesQueryCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: [...SCHEDULE_SOURCES_QUERY_KEY_PREFIX],
  });
}

function useScheduleSourcesQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ScheduleSourcesListParams = React.useMemo(() => {
    const out: ScheduleSourcesListParams = { search: params.search };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.sorting, params.filters]);

  const query = useInfiniteQuery({
    queryKey: scheduleSourcesInfiniteListQueryKey(
      listParams,
      params.filters
    ),
    queryFn: ({ pageParam = 1, signal }) =>
      fetchScheduleSources(
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
        queryKey: [...SCHEDULE_SOURCES_QUERY_KEY_PREFIX],
      }),
  };
}

export {
  invalidateScheduleSourcesQueryCache,
  SCHEDULE_SOURCES_QUERY_KEY_PREFIX,
  SCHEDULE_SOURCES_TABLE_ID,
  useScheduleSourcesQuery,
};
