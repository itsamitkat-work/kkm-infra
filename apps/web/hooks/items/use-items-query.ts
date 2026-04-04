'use client';

import * as React from 'react';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchItems } from './items-api';

export const ITEMS_TABLE_ID = 'items';

type UseItemsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useItemsQuery = ({
  search,
  filters,
  sorting,
}: UseItemsQueryParams) => {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  // Get searchField from filters
  const searchField = React.useMemo(() => {
    return (combinedFilters?.searchField?.values?.[0] as string) || 'name';
  }, [combinedFilters]);

  const query = useInfiniteQuery({
    queryKey: [ITEMS_TABLE_ID, [search, filters, sorting]],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchItems(
        search,
        pageParam as number,
        20,
        searchField,
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
      queryClient.invalidateQueries({ queryKey: [ITEMS_TABLE_ID] }),
  };
};
