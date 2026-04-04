import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectEngineersByProjectHead,
  ProjectEngineer,
} from '../api/supervisors-api';
import { PaginationResponse } from '@/types/common';
import { InfiniteData } from '@tanstack/react-query';

export const PROJECT_ENGINEERS_QUERY_KEY = 'project-engineers';

export function useProjectEngineersQuery(projectHeadId: string | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<
    PaginationResponse<ProjectEngineer>,
    Error,
    InfiniteData<PaginationResponse<ProjectEngineer>>,
    (string | null)[],
    number
  >({
    queryKey: [PROJECT_ENGINEERS_QUERY_KEY, projectHeadId],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjectEngineersByProjectHead(projectHeadId!, signal),
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: !!projectHeadId,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [PROJECT_ENGINEERS_QUERY_KEY],
      }),
  };
}
