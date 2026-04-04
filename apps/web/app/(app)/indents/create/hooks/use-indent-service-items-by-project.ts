'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import {
  fetchIndentServiceItems,
  type IndentServiceListItem,
} from '../../api/indent-api';

export type IndentServiceItemRow = IndentServiceListItem & { id: string };

const QUERY_KEY = 'indent-service-items-by-project';

export function useIndentServiceItemsByProject(projectId: string) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await fetchIndentServiceItems(
        { projectHashId: projectId, page: pageParam as number, pageSize: 20 },
        signal
      );
      return {
        ...res,
        data: res.data.map((row) => ({
          ...row,
          id: row.indentServiceItemHashId,
        })),
      } as PaginationResponse<IndentServiceItemRow>;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasNext) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!projectId,
  });
}
