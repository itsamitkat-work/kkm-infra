'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ScheduleSourceVersionOption, ScheduleTreeRow } from './types';

export const SCHEDULE_VERSIONS_QUERY_KEY = ['schedule_source_versions'] as const;

export function useScheduleSourceVersions() {
  return useQuery({
    queryKey: SCHEDULE_VERSIONS_QUERY_KEY,
    queryFn: async (): Promise<ScheduleSourceVersionOption[]> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('schedule_source_versions')
        .select('id, display_name, year')
        .order('year', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ScheduleSourceVersionOption[];
    },
  });
}

export function scheduleTreeRowsQueryKey(versionId: string | null) {
  return ['schedule_items_tree', versionId] as const;
}

export function useScheduleTreeRows(versionId: string | null) {
  return useQuery({
    queryKey: scheduleTreeRowsQueryKey(versionId),
    queryFn: async (): Promise<ScheduleTreeRow[]> => {
      if (!versionId) return [];
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('schedule_items_tree')
        .select(
          [
            'id',
            'parent_item_id',
            'code',
            'description',
            'node_type',
            'depth',
            'order_index',
            'path_text',
            'schedule_source_version_id',
            'source_version_display_name',
            'rate',
            'unit_symbol',
          ].join(', '),
        )
        .eq('schedule_source_version_id', versionId)
        .order('path_text', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduleTreeRow[];
    },
    enabled: Boolean(versionId),
  });
}
