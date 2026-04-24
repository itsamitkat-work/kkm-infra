'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchScheduleSourcesList } from '../api/schedule-sources-api';

import { SCHEDULE_SOURCES_TABLE_ID } from './use-schedule-sources-query';

function useScheduleSourcesList(filter: string) {
  return useQuery({
    queryKey: [SCHEDULE_SOURCES_TABLE_ID, 'list', filter],
    queryFn: ({ signal }) =>
      fetchScheduleSourcesList(
        createSupabaseBrowserClient(),
        filter,
        signal
      ),
    staleTime: 30 * 1000,
  });
}

function useScheduleSourcesForFilters() {
  return useQuery({
    queryKey: [SCHEDULE_SOURCES_TABLE_ID, 'filter-labels'],
    queryFn: ({ signal }) =>
      fetchScheduleSourcesList(createSupabaseBrowserClient(), '', signal),
    staleTime: 60 * 1000,
  });
}

export { useScheduleSourcesForFilters, useScheduleSourcesList };
