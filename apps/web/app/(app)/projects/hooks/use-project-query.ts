'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchProjectDetail } from '../api/project-api';

const PROJECT_DETAIL_QUERY_KEY_PREFIX = ['project'] as const;

function projectDetailQueryKey(projectId: string | undefined) {
  return [...PROJECT_DETAIL_QUERY_KEY_PREFIX, projectId] as const;
}

function useProject(projectId: string | undefined) {
  const query = useQuery({
    queryKey: projectDetailQueryKey(projectId),
    queryFn: ({ signal }) =>
      fetchProjectDetail(createSupabaseBrowserClient(), projectId!, signal),
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

export { PROJECT_DETAIL_QUERY_KEY_PREFIX, projectDetailQueryKey, useProject };
