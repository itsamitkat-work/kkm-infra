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
  buildProjectsListFilterRpcArgs,
  fetchProjects,
  PROJECTS_QUERY_KEY,
  type ProjectsListParams,
} from '../api/project-api';

const PROJECTS_QUERY_KEY_PREFIX = [PROJECTS_QUERY_KEY] as const;

const PROJECTS_TABLE_ID = PROJECTS_QUERY_KEY;

function projectsQueryKey(listParams: ProjectsListParams) {
  return [...PROJECTS_QUERY_KEY_PREFIX, 'list', listParams] as const;
}

function invalidateProjectsQueryCache(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: [...PROJECTS_QUERY_KEY_PREFIX],
  });
}

function useProjectsQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ProjectsListParams = React.useMemo(() => {
    const out: ProjectsListParams = {
      p_search: params.search.trim() || undefined,
      ...buildProjectsListFilterRpcArgs(params.filters),
    };

    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.p_sort_by = sort.id;
      out.p_sort_dir = sort.desc ? 'desc' : 'asc';
    }

    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: projectsQueryKey(listParams),
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjects(
        createSupabaseBrowserClient(),
        {
          ...listParams,
          p_limit: 20,
          p_offset: (Number(pageParam) - 1) * 20,
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
        queryKey: [...PROJECTS_QUERY_KEY_PREFIX, 'list'],
      }),
  };
}

export {
  PROJECTS_QUERY_KEY,
  PROJECTS_QUERY_KEY_PREFIX,
  PROJECTS_TABLE_ID,
  invalidateProjectsQueryCache,
  useProjectsQuery,
};
