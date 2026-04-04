'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { ItemJustification } from '@/types/item-justification';

export const ITEM_JUSTIFICATION_TABLE_ID = 'item-justification';

type ItemJustificationApiResponse = PaginationResponse<ItemJustification>;

async function fetchItemJustificationPage(
  itemId: string,
  page: number,
  signal?: AbortSignal
): Promise<ItemJustificationApiResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('pageSize', '200');
  params.append('itemId', itemId);
  params.append('sortBy', 'srNo');
  const url = `v2/itemjustification?${params.toString()}`;
  return apiFetch<ItemJustificationApiResponse>(url, { signal });
}

type UseItemJustificationQueryParams = {
  itemId: string;
};

export function useItemJustificationQuery({
  itemId,
}: UseItemJustificationQueryParams) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [ITEM_JUSTIFICATION_TABLE_ID, itemId],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchItemJustificationPage(itemId, pageParam as number, signal),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext || lastPage.page >= lastPage.totalPages)
        return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: Boolean(itemId),
    staleTime: Infinity,
  });

  const { hasNextPage, fetchNextPage, isFetchingNextPage } = query;

  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const data = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [query.data]
  );

  return {
    data,
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [ITEM_JUSTIFICATION_TABLE_ID],
      }),
  };
}
