'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { Filter } from '@/components/ui/filters';
import { SortingState } from '@tanstack/react-table';

export const ASSIGNED_PROJECTS_QUERY_KEY = 'assigned-projects';

export interface AssignedProject {
  hashId: string;
  name: string;
  assignedWorkersCount: number;
}

export const fetchAssignedProjects = async (
  assignedProjectType: AssignedProjectType,
  userHashId: string,
  signal: AbortSignal,
  search?: string,
  page?: number,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  pageSize: number = 20
): Promise<PaginationResponse<AssignedProject>> => {
  const params: Record<string, string | number | undefined> = {
    page,
    pageSize,
    search,
  };

  // Process filters if any
  if (filters) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (filter.values && filter.values.length > 0) {
        params[key] = filter.values.join(',');
      }
    });
  }

  // Process sorting if any
  if (sorting && sorting.length > 0) {
    params.sortBy = sorting[0].id;
    params.order = sorting[0].desc ? 'desc' : 'asc';
  }

  params.assignedProjectType = assignedProjectType;

  return await apiFetch<PaginationResponse<AssignedProject>>(
    `v2/assigned-projects/${userHashId}`,
    {
      signal,
      params,
    }
  );
};
export enum AssignedProjectType {
  ForAttendance = 'ForAttendance',
  ForEBMs = 'ForEBMs',
  All = 'All',
}

export const useAssignedProjectsQuery = (
  userHashId: string | null | undefined,
  assignedProjectType: AssignedProjectType
) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [
      ASSIGNED_PROJECTS_QUERY_KEY,
      assignedProjectType.toString(),
      userHashId,
    ],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchAssignedProjects(
        assignedProjectType,
        userHashId!,
        signal,
        undefined,
        pageParam as number,
        undefined,
        undefined,
        100 // Larger page size for fetching all
      ),
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: !!userHashId,
    staleTime: Infinity,
    refetchOnWindowFocus: true,
  });

  const { hasNextPage, fetchNextPage, isFetchingNextPage } = query;

  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const projects = React.useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  return {
    query,
    projects,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [ASSIGNED_PROJECTS_QUERY_KEY],
      }),
  };
};

export const useAssignedProjectsInfiniteQuery = (
  userHashId: string | null,
  params?: {
    search?: string;
    filters?: Record<string, Filter>;
    sorting?: SortingState;
    pageSize?: number;
  }
) => {
  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQuery({
    queryKey: [ASSIGNED_PROJECTS_QUERY_KEY, 'infinite', userHashId, params],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchAssignedProjects(
        AssignedProjectType.All,
        userHashId!,
        signal,
        params?.search,
        pageParam as number,
        params?.filters,
        params?.sorting,
        params?.pageSize ?? 20
      ),
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: !!userHashId,
    staleTime: Infinity,
    refetchOnWindowFocus: true,
  });

  return {
    query: infiniteQuery,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [ASSIGNED_PROJECTS_QUERY_KEY],
      }),
  };
};
