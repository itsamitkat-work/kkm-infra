'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchProjectItemBreakdown,
  BolBomType,
  BolBomItemType,
} from '../api/bol-bom-api';
import type { ProjectItemBreakdownRow } from '../api/bol-bom-api';

export function useBillItemBreakdownQuery(
  projectId: string | null,
  code: string | null,
  type: BolBomType,
  itemType: BolBomItemType | null,
  enabled: boolean
) {
  const validItemType =
    itemType === 'GEN' || itemType === 'EST' || itemType === 'MSR'
      ? (itemType as BolBomItemType)
      : 'GEN';

  const query = useInfiniteQuery({
    queryKey: ['project-item-breakdown', projectId, code, type, validItemType],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjectItemBreakdown(
        projectId!,
        code!,
        type,
        validItemType,
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
