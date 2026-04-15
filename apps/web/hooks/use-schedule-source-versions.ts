'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@kkm/db';

export type ScheduleSourceVersionRow =
  Database['public']['Tables']['schedule_source_versions']['Row'];

export type ScheduleSourceVersionOption = Pick<
  ScheduleSourceVersionRow,
  'id' | 'display_name' | 'year' | 'sort_order'
>;

export const SCHEDULE_SOURCE_VERSIONS_QUERY_KEY = [
  'schedule_source_versions',
] as const;

export async function fetchScheduleSourceVersions(): Promise<
  ScheduleSourceVersionOption[]
> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('schedule_source_versions')
    .select('id, display_name, year, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ScheduleSourceVersionOption[];
}

export function useScheduleSourceVersions() {
  return useQuery({
    queryKey: SCHEDULE_SOURCE_VERSIONS_QUERY_KEY,
    queryFn: fetchScheduleSourceVersions,
    staleTime: 60 * 60 * 1000,
  });
}

export const useScheduleVersionOptions = useScheduleSourceVersions;
