'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchScheduleTreeRoots } from '../api/schedule-tree-api';

export const SCHEDULE_TREE_ROOTS_QUERY_KEY = ['schedule_tree_roots'] as const;

export function scheduleTreeRootsQueryKey(versionId: string | null) {
  return [...SCHEDULE_TREE_ROOTS_QUERY_KEY, versionId] as const;
}

export function scheduleTreeChildrenQueryKey(
  versionId: string | null,
  parentId: string
) {
  return ['schedule_tree_children', versionId, parentId] as const;
}

function useScheduleTreeRoots(versionId: string | null) {
  return useQuery({
    queryKey: scheduleTreeRootsQueryKey(versionId),
    queryFn: ({ signal }) =>
      fetchScheduleTreeRoots(
        createSupabaseBrowserClient(),
        versionId as string,
        signal
      ),
    enabled: Boolean(versionId),
    staleTime: 1000 * 60 * 5,
  });
}

export { useScheduleTreeRoots };
