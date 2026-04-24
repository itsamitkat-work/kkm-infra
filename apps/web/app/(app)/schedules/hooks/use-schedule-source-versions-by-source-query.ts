'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchScheduleSourceVersionsBySourceId,
  scheduleSourceVersionsBySourceQueryKey,
} from '../api/schedule-source-versions-api';

function useScheduleSourceVersionsBySourceId(
  sourceId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: scheduleSourceVersionsBySourceQueryKey(sourceId),
    queryFn: ({ signal }) =>
      fetchScheduleSourceVersionsBySourceId(
        createSupabaseBrowserClient(),
        sourceId,
        signal
      ),
    enabled: enabled && Boolean(sourceId),
  });
}

export { scheduleSourceVersionsBySourceQueryKey, useScheduleSourceVersionsBySourceId };
