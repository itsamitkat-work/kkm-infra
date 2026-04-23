'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchProjectItemBreakdown,
  BolBomType,
} from '../api/bol-bom-api';
import type { ProjectItemBreakdownRow } from '../api/bol-bom-api';
import type { ProjectBoqLinesQueryScope } from '@/app/projects/[id]/estimation/types';

function normalizeBreakdownScope(
  raw: ProjectBoqLinesQueryScope | string | null | undefined
): ProjectBoqLinesQueryScope {
  if (raw == null || raw === '' || raw === 'GEN') {
    return 'planned';
  }
  if (raw === 'estimation' || raw === 'EST') {
    return 'estimation';
  }
  if (raw === 'measurement' || raw === 'MSR') {
    return 'measurement';
  }
  if (raw === 'billing' || raw === 'BLG') {
    return 'billing';
  }
  return 'planned';
}

export function useBillItemBreakdownQuery(
  projectId: string | null,
  code: string | null,
  type: BolBomType,
  itemScope: ProjectBoqLinesQueryScope | string | null,
  enabled: boolean
) {
  const validScope = normalizeBreakdownScope(itemScope);

  const query = useInfiniteQuery({
    queryKey: ['project-item-breakdown', projectId, code, type, validScope],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjectItemBreakdown(
        projectId!,
        code!,
        type,
        validScope,
        pageParam,
        signal
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: Boolean(enabled && projectId && code),
  });

  React.useEffect(() => {
    if (
      !query.hasNextPage ||
      query.isFetchingNextPage ||
      query.isLoading ||
      query.isError
    ) {
      return;
    }
    query.fetchNextPage();
  }, [
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isLoading,
    query.isError,
    query.fetchNextPage,
    query,
  ]);

  const data = React.useMemo(
    (): ProjectItemBreakdownRow[] =>
      query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
