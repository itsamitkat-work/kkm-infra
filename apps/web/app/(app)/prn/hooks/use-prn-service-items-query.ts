'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Filter } from '@/components/ui/filters';
import { useDebounce } from '@/hooks/use-debounce';
import { PaginationResponse } from '@/types/common';
import {
  fetchPrnServiceItems,
  type PrnServiceListItem,
} from '../api/prn-api';

export type PrnServiceItemRow = PrnServiceListItem & { id: string };

const PRN_SERVICE_ITEMS_TABLE_ID = 'prn-service-items';

function filtersToParams(filters: Filter[]): {
  projectHashId?: string;
  startDate?: string;
  endDate?: string;
  role?: string;
} {
  const map: Record<string, Filter> = {};
  filters.forEach((f) => {
    map[f.field] = f;
  });
  const projectId = map['projectId']?.values?.[0] as string | undefined;
  const dateRange = map['dateRange']?.values as [string, string] | undefined;
  const role = map['role']?.values?.[0] as string | undefined;
  return {
    projectHashId: projectId ?? undefined,
    startDate: dateRange?.[0] ?? undefined,
    endDate: dateRange?.[1] ?? undefined,
    role: role ?? undefined,
  };
}

export function usePrnServiceItemsQuery(
  filters: Filter[] = [],
  search: string = '',
  enabled: boolean = true
) {
  const debouncedSearch = useDebounce(search, 400);
  const params = React.useMemo(
    () => ({
      ...filtersToParams(filters),
      search: debouncedSearch?.trim() || undefined,
    }),
    [filters, debouncedSearch]
  );

  return useInfiniteQuery({
    queryKey: [PRN_SERVICE_ITEMS_TABLE_ID, params],
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await fetchPrnServiceItems(
        { ...params, page: pageParam as number, pageSize: 20 },
        signal
      );
      return {
        ...res,
        data: res.data.map((row) => ({
          ...row,
          id: row.ID,
        })),
      } as PaginationResponse<PrnServiceItemRow>;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasNext) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled,
  });
}
