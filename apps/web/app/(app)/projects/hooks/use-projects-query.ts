'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { Project } from '@/types/projects';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const PROJECTS_TABLE_ID = 'projects';

// API functions
export const fetchProjects = async (
  search: string,
  page?: number,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  signal?: AbortSignal
): Promise<PaginationResponse<Project>> => {
  const params = new URLSearchParams();

  // Add search parameter - trim whitespace for better query handling
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('name', trimmedSearch);
  }

  // Add pagination parameters
  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  let statusFilterExists = false;

  // Process filters
  if (filters && Object.keys(filters).length > 0) {
    for (const key in filters) {
      const filter = filters[key];
      const { operator, values } = filter;

      // Skip empty filters
      if (!values || values.length === 0) continue;

      // Track if status filter is applied
      if (key === 'status') {
        statusFilterExists = true;
      }

      // Handle different filter operators
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
          // Join multiple values with comma
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

  // Default to active status if no status filter is specified
  if (!statusFilterExists) {
    params.append('status', 'active');
  }

  // Add sorting parameters
  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('sortBy', sort.id);
    params.append('order', sort.desc ? 'desc' : 'asc');
  }

  // Build final URL
  const queryString = params.toString();
  const url = queryString ? `/v2/project?${queryString}` : '/v2/project';

  return await apiFetch<PaginationResponse<Project>>(url, { signal });
};

type UseProjectsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useProjectsQuery = ({
  search,
  filters,
  sorting,
}: UseProjectsQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [PROJECTS_TABLE_ID, [search, filters, sorting]],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjects(search, pageParam, combinedFilters, sorting, signal),
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
      queryClient.invalidateQueries({ queryKey: [PROJECTS_TABLE_ID] }),
  };
};
