'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const EMPLOYEE_TYPES_TABLE_ID = 'employee-types';

export type EmployeeType = {
  hashId: string;
  name: string;
};

// API response wrapper type (matches API response structure)
interface EmployeeTypesApiResponse {
  isSuccess: boolean;
  data: Array<{
    hashid: string;
    name: string;
  }>;
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// API functions
export const fetchEmployeeTypes = async (
  search: string,
  page?: number,
  signal?: AbortSignal
): Promise<PaginationResponse<EmployeeType>> => {
  const params = new URLSearchParams();

  // Add search parameter - trim whitespace for better query handling
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('Search', trimmedSearch);
  }

  // Add pagination parameters
  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  // Build final URL
  const queryString = params.toString();
  const url = queryString ? `v2/employee-type?${queryString}` : 'v2/employee-type';

  const response = await apiFetch<EmployeeTypesApiResponse>(url, { signal });

  // Map hashid to hashId for data-table compatibility
  const mappedData: EmployeeType[] = response.data.map((item) => ({
    hashId: item.hashid,
    name: item.name,
  }));

  const paginationResponse: PaginationResponse<EmployeeType> = {
    data: mappedData,
    totalCount: response.totalCount,
    page: response.page,
    pageSize: response.pageSize,
    totalPages: response.totalPages,
    hasPrevious: response.hasPrevious,
    hasNext: response.hasNext,
    isSuccess: response.isSuccess,
    statusCode: response.statusCode,
    message: response.message,
  };

  return paginationResponse;
};

type UseEmployeeTypesQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useEmployeeTypesQuery = ({
  search,
  filters,
  sorting,
}: UseEmployeeTypesQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [EMPLOYEE_TYPES_TABLE_ID, [search, filters, sorting]],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchEmployeeTypes(search, pageParam as number, signal),
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
      queryClient.invalidateQueries({ queryKey: [EMPLOYEE_TYPES_TABLE_ID] }),
  };
};
