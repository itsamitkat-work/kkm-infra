'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const DESIGNATIONS_TABLE_ID = 'designations';

export type Designation = {
  hashId: string;
  employeeTypeName: string;
  employeeTypeHashID: string;
  code: string;
  name: string;
  basicRate: string;
  remarks: string | null;
  status: string;
  subDesignationsCount: number;
};

// API response wrapper type (matches API response structure)
interface DesignationsApiResponse {
  isSuccess: boolean;
  data: Array<{
    employeeTypeName: string;
    hashId: string;
    employeeTypeHashID: string;
    code: string;
    name: string;
    basicRate: string;
    remarks: string | null;
    status: string;
    subDesignationsCount: number;
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
export const fetchDesignations = async (
  search: string,
  page?: number,
  sorting?: SortingState,
  filters?: Record<string, Filter>,
  signal?: AbortSignal
): Promise<PaginationResponse<Designation>> => {
  const params = new URLSearchParams();

  // Add search parameter - trim whitespace for better query handling
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('Search', trimmedSearch);
  }

  // Add sorting parameters
  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('SortBy', sort.id);
    params.append('Order', sort.desc ? 'desc' : 'asc');
  }

  // Process filters for additional query parameters
  if (filters && Object.keys(filters).length > 0) {
    for (const key in filters) {
      const filter = filters[key];
      const { operator, values } = filter;

      // Skip empty filters
      if (!values || values.length === 0) continue;

      // Handle different filter operators
      switch (operator) {
        case 'is':
        case 'equals':
        default:
          params.append(key, String(values[0]));
          break;
      }
    }
  }

  // Add pagination parameters
  if (page !== undefined) params.append('Page', page.toString());
  params.append('PageSize', '20');

  // Build final URL
  const queryString = params.toString();
  const url = queryString
    ? `v2/designations?${queryString}`
    : 'v2/designations';

  const response = await apiFetch<DesignationsApiResponse>(url, { signal });

  // Map API response to Designation type (already matches, but ensuring type safety)
  const mappedData: Designation[] = response.data.map((item) => ({
    hashId: item.hashId,
    employeeTypeName: item.employeeTypeName,
    employeeTypeHashID: item.employeeTypeHashID,
    code: item.code,
    name: item.name,
    basicRate: item.basicRate,
    remarks: item.remarks,
    status: item.status,
    subDesignationsCount: item.subDesignationsCount,
  }));

  const paginationResponse: PaginationResponse<Designation> = {
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

type UseDesignationsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useDesignationsQuery = ({
  search,
  filters,
  sorting,
}: UseDesignationsQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [DESIGNATIONS_TABLE_ID, search, filters, sorting],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchDesignations(
        search,
        pageParam as number,
        sorting,
        combinedFilters,
        signal
      ),
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
      queryClient.invalidateQueries({ queryKey: [DESIGNATIONS_TABLE_ID] }),
  };
};
