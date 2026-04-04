'use client';

import * as React from 'react';
import { PaginationResponse } from '@/types/common';
import { AssignedUser } from '../types';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

// Extended type for users with project information (used in "All Resources" view)
export interface AssignedUserWithProject extends AssignedUser {
  projectId: string;
  projectName: string;
}

export const PROJECT_USERS_QUERY_ID = 'project-users';

// API response type for assigned workers
interface AssignedWorkerApiResponse {
  id: string;
  empId: string;
  empName: string;
  empCode: number;
  assignedToUserAt: string | null;
  assignedToProjectAt: string | null;
  projectId: string | null;
  projectName: string | null;
}

// API function to fetch assigned workers from API
export const fetchProjectUsers = async (
  userHashId: string,
  projectId: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<AssignedUser | AssignedUserWithProject>> => {
  const pageSize = 50;

  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  // Only add projectId if it's not 'all'
  if (projectId !== 'all') {
    params.append('projectId', projectId);
  }

  const response = await apiFetch<
    PaginationResponse<AssignedWorkerApiResponse>
  >(`v2/resource-pool/${userHashId}?${params.toString()}`, {
    signal,
  });

  // Transform API response to AssignedUser format
  const transformedData = response.data.map((worker) => {
    // Use assignedToProjectAt if available, otherwise use assignedToUserAt
    // If both are null, use current date as fallback
    const assignedAtDate = worker.assignedToProjectAt
      ? new Date(worker.assignedToProjectAt)
      : worker.assignedToUserAt
        ? new Date(worker.assignedToUserAt)
        : null;

    const baseUser: AssignedUser = {
      hashId: worker.empId,
      name: worker.empName,
      empCode: worker.empCode,
      assignedAt: assignedAtDate,
    };

    // If projectId is 'all' or worker has project info, include it
    if (projectId === 'all' && worker.projectId && worker.projectName) {
      return {
        ...baseUser,
        projectId: worker.projectId,
        projectName: worker.projectName,
      } as AssignedUserWithProject;
    }

    return baseUser;
  });

  return {
    ...response,
    data: transformedData,
  };
};

type UseProjectUsersQueryParams = {
  projectId: string;
  userHashId: string | null;
};

export const useProjectUsersQuery = ({
  projectId,
  userHashId,
}: UseProjectUsersQueryParams) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [PROJECT_USERS_QUERY_ID, userHashId, projectId],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjectUsers(userHashId!, projectId, pageParam, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.hasNext) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userHashId && !!projectId && projectId !== '', // Only fetch if userHashId and projectId are provided
  });

  // Automatically fetch all pages in batches
  React.useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage && query.data) {
      query.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hasNextPage, query.isFetchingNextPage]);

  // Flatten all pages into a single array
  const users = React.useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) ?? [];
  }, [query.data]);

  return {
    query,
    users,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [PROJECT_USERS_QUERY_ID] }),
  };
};
