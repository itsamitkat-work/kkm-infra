'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export type MasterName =
  | 'MaterialType'
  | 'MaterialGroup'
  | 'MaterialCategory'
  | 'Unit';

export interface MasterTypeItem {
  hashid: string;
  name: string;
}

interface MasterTypesApiResponse {
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

const fetchMasterTypes = async (
  masterName: MasterName,
  page: number = 1,
  signal?: AbortSignal
): Promise<MasterTypesApiResponse> => {
  const url = `v2/mastername?masterName=${masterName}&Page=${page}&PageSize=50`;
  return await apiFetch<MasterTypesApiResponse>(url, { signal });
};

export const useMasterTypes = (masterName: MasterName) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['master-types', masterName],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchMasterTypes(masterName, pageParam as number, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNext && lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity, // Store infinitely
    gcTime: Infinity, // Keep in cache infinitely
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// Helper hook to get all master types as a flat array
export const useMasterTypesList = (masterName: MasterName) => {
  const query = useMasterTypes(masterName);

  const allItems = React.useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.data.map((item) => ({
        hashid: item.hashid,
        name: item.name,
      }))
    );
  }, [query.data]);

  // Fetch all pages if there are more
  React.useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const labelValues = React.useMemo(
    () =>
      allItems.map((item) => ({
        value: item.name,
        label: item.name,
      })),
    [allItems]
  );

  return {
    items: allItems,
    labelValues,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
};
