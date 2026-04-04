'use client';

import * as React from 'react';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import {
  useInfiniteQuery,
  useQueryClient,
  UseInfiniteQueryResult,
  InfiniteData,
} from '@tanstack/react-query';

type FetchFunction<T> = (
  page?: number,
  signal?: AbortSignal
) => Promise<PaginationResponse<T>>;

type FilterFunction<T> = (
  items: T[],
  search: string,
  filters: Record<string, Filter>
) => T[];

type SortFunction<T> = (items: T[], sorting: SortingState) => T[];

type UseLocalQueryOptions<T> = {
  queryKey: (string | number | boolean | null | undefined)[];
  fetchFn: FetchFunction<T>;
  search: string;
  filters: Filter[];
  sorting: SortingState;
  filterFn?: FilterFunction<T>;
  sortFn?: SortFunction<T>;
  pageSize?: number;
  staleTime?: number;
};

const defaultFilterFn = <T extends Record<string, unknown>>(
  items: T[],
  search: string,
  filters: Record<string, Filter>
): T[] => {
  let filtered = [...items];

  const trimmedSearch = search?.trim().toLowerCase();
  if (trimmedSearch) {
    filtered = filtered.filter((item) => {
      return Object.values(item).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(trimmedSearch);
      });
    });
  }

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (!filter.values || filter.values.length === 0) return;

      filtered = filtered.filter((item) => {
        const itemValue = item[key];
        if (itemValue === null || itemValue === undefined) return false;

        const itemValueStr = String(itemValue).toLowerCase();
        return filter.values.some((filterValue) =>
          itemValueStr.includes(String(filterValue).toLowerCase())
        );
      });
    });
  }

  return filtered;
};

const defaultSortFn = <T extends Record<string, unknown>>(
  items: T[],
  sorting: SortingState
): T[] => {
  if (!sorting || sorting.length === 0) return items;

  const sorted = [...items];
  const sort = sorting[0];

  sorted.sort((a, b) => {
    const aValue = a[sort.id];
    const bValue = b[sort.id];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sort.desc
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    }

    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return sort.desc
        ? (bValue ? 1 : -1) - (aValue ? 1 : -1)
        : (aValue ? 1 : -1) - (bValue ? 1 : -1);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sort.desc ? bValue - aValue : aValue - bValue;
    }

    return 0;
  });

  return sorted;
};

export function useLocalQuery<T extends Record<string, unknown>>({
  queryKey,
  fetchFn,
  search,
  filters,
  sorting,
  filterFn = defaultFilterFn,
  sortFn = defaultSortFn,
  pageSize = 20,
  staleTime = Infinity,
}: UseLocalQueryOptions<T>) {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const baseQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1, signal }) => fetchFn(pageParam, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime,
  });

  // Automatically fetch all pages
  React.useEffect(() => {
    if (baseQuery.hasNextPage && !baseQuery.isFetchingNextPage) {
      baseQuery.fetchNextPage();
    }
  }, [
    baseQuery.hasNextPage,
    baseQuery.isFetchingNextPage,
    baseQuery.fetchNextPage,
  ]);

  // Get all data from all pages
  const allItems = React.useMemo(() => {
    if (!baseQuery.data?.pages) return [];
    return baseQuery.data.pages.flatMap((page) => page.data);
  }, [baseQuery.data]);

  // Apply local filtering and sorting
  const filteredAndSortedItems = React.useMemo(() => {
    let result = filterFn(allItems, search, combinedFilters);
    result = sortFn(result, sorting);
    return result;
  }, [allItems, search, combinedFilters, sorting, filterFn, sortFn]);

  // Create paginated response for the table
  const paginatedData = React.useMemo(() => {
    const pages: PaginationResponse<T>[] = [];
    const totalCount = filteredAndSortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    for (let i = 0; i < totalPages; i++) {
      const start = i * pageSize;
      const end = start + pageSize;
      const pageData = filteredAndSortedItems.slice(start, end);

      pages.push({
        data: pageData,
        totalCount,
        page: i + 1,
        pageSize,
        totalPages,
        hasPrevious: i > 0,
        hasNext: i < totalPages - 1,
        isSuccess: true,
        statusCode: 200,
        message: 'Success',
      });
    }

    return pages;
  }, [filteredAndSortedItems, pageSize]);

  // Create a modified query object that returns the filtered/sorted data
  const modifiedQuery: UseInfiniteQueryResult<
    InfiniteData<PaginationResponse<T>, unknown>,
    Error
  > = React.useMemo(
    () =>
      ({
        ...baseQuery,
        data: {
          pages: paginatedData,
          pageParams: paginatedData.map((_, index) => index + 1),
        },
        hasNextPage:
          paginatedData.length > 0 && paginatedData[0]?.hasNext === true,
      }) as UseInfiniteQueryResult<
        InfiniteData<PaginationResponse<T>, unknown>,
        Error
      >,
    [baseQuery, paginatedData]
  );

  return {
    query: modifiedQuery,
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}
