'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ScheduleSourceVersionRow } from '@/hooks/use-schedule-source-versions';

export function scheduleSourceVersionsBySourceQueryKey(sourceId: string) {
  return ['schedule_source_versions', 'by_source', sourceId] as const;
}

export async function fetchScheduleSourceVersionsBySourceId(
  sourceId: string
): Promise<ScheduleSourceVersionRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('schedule_source_versions')
    .select('*')
    .eq('schedule_source_id', sourceId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ScheduleSourceVersionRow[];
}

export function useScheduleSourceVersionsBySourceId(
  sourceId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: scheduleSourceVersionsBySourceQueryKey(sourceId),
    queryFn: () => fetchScheduleSourceVersionsBySourceId(sourceId),
    enabled: enabled && Boolean(sourceId),
  });
}
