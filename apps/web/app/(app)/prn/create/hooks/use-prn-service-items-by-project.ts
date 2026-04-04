'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import {
  fetchPrnServiceItems,
  type PrnServiceListItem,
} from '../../api/prn-api';

export type PrnServiceItemRow = PrnServiceListItem & { id: string };

const QUERY_KEY = 'prn-service-items-by-project';

export function usePrnServiceItemsByProject(projectId: string) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await fetchPrnServiceItems(
        { projectHashId: projectId, page: pageParam as number, pageSize: 20 },
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
    enabled: !!projectId,
  });
}
