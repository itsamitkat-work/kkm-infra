'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import React from 'react';
import { DeviationReportType, DeviationResponse } from '../types';

/**
 * Fetches project items from the API with pagination, filtering, and sorting support
 * @param id - Project ID
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @param filters - Filter criteria
 * @param sorting - Sorting configuration
 * @param type - Project item type (GEN, EST, MSR)
 * @returns Promise with paginated project items
 */
export const fetchDeviationReportItems = async (
  id: string,
  page?: number,
  pageSize?: number,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  type?: DeviationReportType
): Promise<PaginationResponse<DeviationResponse>> => {
  if (!id) {
    throw new Error('Project ID is required');
  }
  const params = new URLSearchParams();
  if (page !== undefined) params.append('page', page.toString());
  if (pageSize !== undefined) params.append('pageSize', pageSize.toString());

  if (filters) {
    for (const key in filters) {
      const filter = filters[key];
      const { operator, values } = filter;

      if (!values || values.length === 0) continue;

      switch (operator) {
        case 'between':
        case 'not_between':
          if (values.length === 2) {
            if (
              typeof values[0] === 'number' &&
              typeof values[1] === 'number'
            ) {
              params.append(`${key}_min`, values[0].toString());
              params.append(`${key}_max`, values[1].toString());
            } else {
              params.append(`${key}_from`, String(values[0]));
              params.append(`${key}_to`, String(values[1]));
            }
          }
          break;
        case 'is_any_of':
        case 'is_not_any_of':
          params.append(key, values.join(','));
          break;
        case 'greater_than':
          params.append(`${key}_gt`, String(values[0]));
          break;
        case 'less_than':
          params.append(`${key}_lt`, String(values[0]));
          break;
        case 'not_equals':
          params.append(`${key}_ne`, String(values[0]));
          break;
        case 'equals':
        case 'is':
        default:
          params.append(key, String(values[0]));
          break;
      }
    }
  }

  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('sortBy', sort.id);
    params.append('order', sort.desc ? 'desc' : 'asc');
  }

  const queryString = params.toString();
  let url = `/v2/project/deviations/${id}?type=${type}`;
  if (queryString) {
    url += `&${queryString}`;
  }

  if (!sorting || sorting.length === 0) {
    url += `&sortBy=srNo&order=asc`;
  }

  try {
    return await apiFetch<PaginationResponse<DeviationResponse>>(url);
  } catch (error) {
    console.error('Failed to fetch project items:', error);
    throw error;
  }
};

/**
 * React hook for managing project items list with infinite scrolling
 * @param id - Project ID (required)
 * @param pageSize - Number of items per page (default: 50)
 * @param filters - Filter criteria
 * @param sorting - Sorting configuration
 * @param type - Project item type (GEN, EST, MSR)
 * @returns Object containing data, pagination info, and control functions
 */
export const useDeviationReportItemsList = ({
  id,
  pageSize = 50,
  filters,
  sorting,
  type,
  fetchAll = true,
}: {
  id: string;
  pageSize?: number;
  filters?: Record<string, Filter>;
  sorting?: SortingState;
  type: DeviationReportType;
  fetchAll?: boolean;
}) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, ...rest } =
    useInfiniteQuery({
      queryKey: ['deviations', id, { filters, sorting, pageSize, type }],
      queryFn: ({ pageParam }) =>
        fetchDeviationReportItems(
          id,
          pageParam,
          pageSize,
          filters,
          sorting,
          type
        ),
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.totalPages > allPages.length) {
          return allPages.length + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    });

  // Automatically fetch all pages if fetchAll flag is true
  React.useEffect(() => {
    if (fetchAll && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchAll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const mappedData = React.useMemo(() => {
    if (!data?.pages) return [];

    return data.pages.flatMap((page) => page.data);
  }, [data]);

  return {
    data: mappedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount: data?.pages[0]?.totalCount ?? 0,
    totalPages: data?.pages[0]?.totalPages ?? 0,
    currentPage: data?.pages[0]?.page ?? 1,
    pageSize: data?.pages[0]?.pageSize ?? pageSize,
    hasPrevious: data?.pages[0]?.hasPrevious ?? false,
    hasNext: data?.pages[0]?.hasNext ?? false,
    ...rest,
  };
};
