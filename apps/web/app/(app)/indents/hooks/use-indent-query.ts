'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Filter } from '@/components/ui/filters';
import { useDebounce } from '@/hooks/use-debounce';
import { PaginationResponse } from '@/types/common';
import { fetchIndents, type IndentListItem } from '../api/indent-api';

export type IndentRow = IndentListItem & { id: string };

const INDENT_TABLE_ID = 'indents';

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

export function useIndentQuery(
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
    queryKey: [INDENT_TABLE_ID, params],
    enabled,
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await fetchIndents(
        { ...params, page: pageParam as number, pageSize: 20 },
        signal
      );
      return {
        ...res,
        data: res.data.map((row) => ({ ...row, id: row.indentCode })),
      } as PaginationResponse<IndentRow>;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasNext) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    // enabled: Boolean(params.projectHashId),
  });
}
