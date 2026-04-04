'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { ProjectSegment } from '@/types/projects';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const PROJECT_SEGMENTS_TABLE_ID = 'project-segments';

interface SegmentsApiResponse {
  data: ProjectSegment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isSuccess: boolean;
  statusCode: number;
  message: string;
}

interface FetchProjectSegmentsParams {
  projectId: string;
  search?: string;
  page?: number;
  filters?: Record<string, Filter>;
  sorting?: SortingState;
  signal?: AbortSignal;
  pageSize?: number;
}

export const fetchProjectSegments = async ({
  projectId,
  search = '',
  page,
  filters,
  sorting,
  signal,
  pageSize = 20,
}: FetchProjectSegmentsParams): Promise<PaginationResponse<ProjectSegment>> => {
  const params = new URLSearchParams();

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('segmentName', trimmedSearch);
  }

  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());

  if (filters && Object.keys(filters).length > 0) {
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
  } else {
    params.append('sortBy', 'displayOrder');
    params.append('order', 'asc');
  }
  params.append('projectId', projectId);

  const queryString = params.toString();
  const url = queryString
    ? `/v2/project/${projectId}/segment?${queryString}`
    : `/v2/project/${projectId}/segment`;

  const response = await apiFetch<SegmentsApiResponse>(url, { signal });

  return {
    data: response.data || [],
    totalCount: response.totalCount || 0,
    page: response.page || 1,
    pageSize: response.pageSize || 10,
    totalPages: response.totalPages || 1,
    hasPrevious: response.hasPrevious || false,
    hasNext: response.hasNext || false,
    isSuccess: response.isSuccess ?? true,
    statusCode: response.statusCode || 200,
    message: response.message || 'Success',
  };
};

type UseProjectSegmentsQueryParams = {
  projectId: string;
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useProjectSegmentsQuery = ({
  projectId,
  search,
  filters,
  sorting,
}: UseProjectSegmentsQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [PROJECT_SEGMENTS_TABLE_ID, projectId, search, filters, sorting],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjectSegments({
        projectId,
        search,
        page: pageParam,
        filters: combinedFilters,
        sorting,
        signal,
        pageSize: 20,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!projectId,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [PROJECT_SEGMENTS_TABLE_ID, projectId],
      }),
  };
};
