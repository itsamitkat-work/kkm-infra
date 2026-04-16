'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProjectDetail } from '@/hooks/useProjects';

export function useProject(projectId: string | undefined) {
  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetail(projectId!),
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  });

  return {
    project: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
