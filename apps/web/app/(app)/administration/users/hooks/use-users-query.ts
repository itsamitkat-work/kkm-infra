'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { User } from '@/types/users';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const USERS_TABLE_ID = 'users';

// API response wrapper type
interface UsersApiResponse {
  isSuccess: boolean;
  data: User[];
  message: string;
  statusCode: number;
}

// API functions
export const fetchUsers = async (
  search: string,
  page?: number,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  signal?: AbortSignal
): Promise<PaginationResponse<User>> => {
  const params = new URLSearchParams();

  // Add search parameter - trim whitespace for better query handling
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('search', trimmedSearch);
  }

  // Add pagination parameters
  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  // Add sorting parameters
  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('sortBy', sort.id);
    params.append('order', sort.desc ? 'desc' : 'asc');
  }

  // Build final URL
  const queryString = params.toString();
  const url = queryString ? `v2/user?${queryString}` : 'v2/user';

  const response = await apiFetch<UsersApiResponse>(url, { signal });

  const paginationResponse: PaginationResponse<User> = {
    data: response.data,
    totalCount: response.data.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: response.isSuccess,
    statusCode: response.statusCode,
    message: response.message,
  };

  return paginationResponse;
};

type UseUsersQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useUsersQuery = ({
  search,
  filters,
  sorting,
}: UseUsersQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [USERS_TABLE_ID, [search, filters, sorting]],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchUsers(search, pageParam, combinedFilters, sorting, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] }),
  };
};
