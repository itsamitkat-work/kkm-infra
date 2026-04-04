import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type InfiniteData,
} from '@tanstack/react-query';
import React from 'react';

export interface BasicRate {
  hashID: string;
  hashId?: string;
  code: string;
  unit: string;
  name: string;
  nickName: string | null;
  rate: number;
  stateSchedule: string;
  stateScheduleName: string | null;
  types: string;
  status: string;
  autodate: string;
  userId: string | null;
  materialTypeHashId: string | null;
  materialGroupHashId: string | null;
  materialCategoryHashId: string | null;
  mastername: string | null;
  groupname: string | null;
  catname: string | null;
}

export type BasicRatesApiResponse = PaginationResponse<BasicRate>;

export interface BasicRatesListParams {
  search?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  code?: string;
  name?: string;
  types?: string;
  materialTypeHashId?: string;
  materialGroupHashId?: string;
  materialCategoryHashId?: string;
}

export const fetchBasicRates = async (
  params: BasicRatesListParams = {}
): Promise<BasicRatesApiResponse> => {
  const queryParams = new URLSearchParams();

  if (params.search) {
    queryParams.append('Search', params.search);
  }
  if (params.sortBy) {
    queryParams.append('SortBy', params.sortBy);
  }
  if (params.order) {
    queryParams.append('Order', params.order);
  }
  if (params.page) {
    queryParams.append('Page', params.page.toString());
  }
  if (params.pageSize) {
    queryParams.append('PageSize', params.pageSize.toString());
  }
  if (params.code) {
    queryParams.append('Code', params.code);
  }
  if (params.name) {
    queryParams.append('Name', params.name);
  }
  if (params.types) {
    queryParams.append('Types', params.types);
  }
  if (params.materialTypeHashId) {
    queryParams.append('MaterialTypeHashId', params.materialTypeHashId);
  }
  if (params.materialGroupHashId) {
    queryParams.append('MaterialGroupHashId', params.materialGroupHashId);
  }
  if (params.materialCategoryHashId) {
    queryParams.append('MaterialCategoryHashId', params.materialCategoryHashId);
  }

  return apiFetch<BasicRatesApiResponse>(
    `/v2/basicrates?${queryParams.toString()}`
  );
};

export const useBasicRatesList = (
  params: BasicRatesListParams = {},
  options?: Omit<
    UseInfiniteQueryOptions<BasicRatesApiResponse, Error>,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >
) => {
  const queryResult = useInfiniteQuery({
    queryKey: ['basic-rates', params],
    queryFn: ({ pageParam = 1 }) =>
      fetchBasicRates({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
    ...options,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    ...rest
  } = queryResult;

  const basicRates = React.useMemo(() => {
    return (
      (data as InfiniteData<BasicRatesApiResponse> | undefined)?.pages.flatMap(
        (page: BasicRatesApiResponse) => page.data
      ) ?? []
    );
  }, [data]);

  return {
    data: basicRates,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    ...rest,
  };
};
