import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

export type ScheduleSourceVersionRow =
  Database['public']['Tables']['schedule_source_versions']['Row'];

export type ScheduleSourceVersionOption = Pick<
  ScheduleSourceVersionRow,
  'id' | 'display_name' | 'year' | 'sort_order'
>;

export const SCHEDULE_SOURCE_VERSIONS_QUERY_KEY = [
  'schedule_source_versions',
] as const;

async function fetchScheduleSourceVersions(
  supabase: SupabaseClient<Database>,
  signal?: AbortSignal
): Promise<ScheduleSourceVersionOption[]> {
  let q = supabase
    .from('schedule_source_versions')
    .select('id, display_name, year, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  return (data ?? []) as ScheduleSourceVersionOption[];
}

function scheduleSourceVersionsBySourceQueryKey(sourceId: string) {
  return ['schedule_source_versions', 'by_source', sourceId] as const;
}

async function fetchScheduleSourceVersionsBySourceId(
  supabase: SupabaseClient<Database>,
  sourceId: string,
  signal?: AbortSignal
): Promise<ScheduleSourceVersionRow[]> {
  let q = supabase
    .from('schedule_source_versions')
    .select('*')
    .eq('schedule_source_id', sourceId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  return (data ?? []) as ScheduleSourceVersionRow[];
}

export {
  fetchScheduleSourceVersions,
  fetchScheduleSourceVersionsBySourceId,
  scheduleSourceVersionsBySourceQueryKey,
};
