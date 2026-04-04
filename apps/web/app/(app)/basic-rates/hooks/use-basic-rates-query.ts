'use client';

import * as React from 'react';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useQueryClient } from '@tanstack/react-query';
import { fetchBasicRates, BasicRatesListParams } from '@/hooks/use-basic-rates';
import { useInfiniteQuery } from '@tanstack/react-query';

export const BASIC_RATES_TABLE_ID = 'basic-rates';

type UseBasicRatesQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useBasicRatesQuery = ({
  search,
  filters,
  sorting,
}: UseBasicRatesQueryParams) => {
  const queryClient = useQueryClient();

  const params: BasicRatesListParams = React.useMemo(() => {
    const params: BasicRatesListParams = {
      search,
    };

    // Extract filter values
    filters.forEach((filter) => {
      if (filter.field === 'types' && filter.values.length > 0) {
        params.types = filter.values[0] as string;
      }
      if (filter.field === 'code' && filter.values.length > 0) {
        params.code = filter.values[0] as string;
      }
      if (filter.field === 'name' && filter.values.length > 0) {
        params.name = filter.values[0] as string;
      }
      if (filter.field === 'MaterialTypeHashId' && filter.values.length > 0) {
        params.materialTypeHashId = filter.values[0] as string;
      }
      if (filter.field === 'MaterialGroupHashId' && filter.values.length > 0) {
        params.materialGroupHashId = filter.values[0] as string;
      }
      if (
        filter.field === 'MaterialCategoryHashId' &&
        filter.values.length > 0
      ) {
        params.materialCategoryHashId = filter.values[0] as string;
      }
    });

    // Add sorting
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.sortBy = sort.id;
      params.order = sort.desc ? 'desc' : 'asc';
    }

    return params;
  }, [search, filters, sorting]);

  const query = useInfiniteQuery({
    queryKey: [BASIC_RATES_TABLE_ID, params],
    queryFn: ({ pageParam = 1 }) =>
      fetchBasicRates({
        ...params,
        page: pageParam as number,
        pageSize: 20,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.hasNext) {
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
      queryClient.invalidateQueries({ queryKey: [BASIC_RATES_TABLE_ID] }),
  };
};
