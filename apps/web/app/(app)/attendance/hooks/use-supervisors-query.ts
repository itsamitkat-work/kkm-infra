import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSupervisorsByProjectEngineer,
  Supervisor,
} from '../api/supervisors-api';
import { PaginationResponse } from '@/types/common';
import { InfiniteData } from '@tanstack/react-query';

export const SUPERVISORS_QUERY_KEY = 'supervisors';

export function useSupervisorsQuery(projectEngineerId: string | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<
    PaginationResponse<Supervisor>,
    Error,
    InfiniteData<PaginationResponse<Supervisor>>,
    (string | null)[],
    number
  >({
    queryKey: [SUPERVISORS_QUERY_KEY, projectEngineerId],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchSupervisorsByProjectEngineer(projectEngineerId!, signal),
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: !!projectEngineerId,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [SUPERVISORS_QUERY_KEY] }),
  };
}
