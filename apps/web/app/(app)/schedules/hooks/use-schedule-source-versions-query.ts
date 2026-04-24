'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchScheduleSourceVersions,
  SCHEDULE_SOURCE_VERSIONS_QUERY_KEY,
} from '../api/schedule-source-versions-api';

function useScheduleSourceVersions() {
  return useQuery({
    queryKey: SCHEDULE_SOURCE_VERSIONS_QUERY_KEY,
    queryFn: ({ signal }) =>
      fetchScheduleSourceVersions(createSupabaseBrowserClient(), signal),
    staleTime: 60 * 60 * 1000,
  });
}

const useScheduleVersionOptions = useScheduleSourceVersions;

export {
  SCHEDULE_SOURCE_VERSIONS_QUERY_KEY,
  useScheduleSourceVersions,
  useScheduleVersionOptions,
};
