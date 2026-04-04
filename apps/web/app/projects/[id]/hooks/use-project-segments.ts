import { useMemo } from 'react';
import { fetchProjectSegments } from './use-project-segments-query';
import { useQuery } from '@tanstack/react-query';

export function useProjectSegments(projectId: string) {
  const {
    data: segmentsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['projectSegments', projectId],
    queryFn: () =>
      fetchProjectSegments({
        projectId: projectId,
        pageSize: 1000, // large pageSize to fetch all segments
        sorting: [{ id: 'displayOrder', desc: false }],
      }),
    enabled: !!projectId,
    staleTime: Infinity,
  });

  const segments = useMemo(() => {
    return segmentsData?.data || [];
  }, [segmentsData?.data]);

  return {
    segments,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
