'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchScheduleTreeSearch } from '../api/schedule-tree-api';

export function scheduleTreeSearchQueryKey(versionId: string | null, q: string) {
  return ['schedule_tree_search', versionId, q] as const;
}

function useScheduleTreeSearch(
  versionId: string | null,
  q: string,
  limit = 50
) {
  const normalized = q.trim();
  return useQuery({
    queryKey: scheduleTreeSearchQueryKey(versionId, normalized),
    queryFn: ({ signal }) => {
      if (!versionId || normalized.length < 2) {
        return Promise.resolve([]);
      }
      return fetchScheduleTreeSearch(
        createSupabaseBrowserClient(),
        versionId,
        normalized,
        limit,
        signal
      );
    },
    enabled: Boolean(versionId && normalized.length >= 2),
    staleTime: 1000 * 30,
  });
}

export { useScheduleTreeSearch };
