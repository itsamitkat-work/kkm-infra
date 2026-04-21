'use client';

import { PaginationResponse } from '@/types/common';
import { ProjectSegment } from '@/types/projects';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectSegmentsAsSinglePage,
  type FetchProjectSegmentsParams,
} from '@/lib/projects/project-segments-repo';

export const PROJECT_SEGMENTS_TABLE_ID = 'project-segments';

export const fetchProjectSegments = async (
  params: FetchProjectSegmentsParams
): Promise<PaginationResponse<ProjectSegment>> => {
  return fetchProjectSegmentsAsSinglePage({
    projectId: params.projectId,
    search: params.search,
    sorting: params.sorting,
    signal: params.signal,
  });
};

type UseProjectSegmentsQueryParams = {
  projectId: string;
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useProjectSegmentsQuery = ({
  projectId,
  search,
  filters,
  sorting,
}: UseProjectSegmentsQueryParams) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [PROJECT_SEGMENTS_TABLE_ID, projectId, search, filters, sorting],
    queryFn: async ({ signal }) =>
      fetchProjectSegmentsAsSinglePage({
        projectId,
        search,
        sorting,
        signal,
      }),
    getNextPageParam: () => undefined,
    initialPageParam: 1,
    enabled: !!projectId,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [PROJECT_SEGMENTS_TABLE_ID, projectId],
      }),
  };
};
