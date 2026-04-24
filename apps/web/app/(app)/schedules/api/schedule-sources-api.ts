import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';
import type { PaginationResponse } from '@/types/common';

export type ScheduleSourceRow =
  Database['public']['Tables']['schedule_sources']['Row'];

export type ScheduleSourcesListParams = {
  search?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

export type ScheduleSourceOptionRow = Pick<
  ScheduleSourceRow,
  'id' | 'name' | 'display_name'
>;

export interface ScheduleSourceComboboxOption {
  value: string;
  label: string;
  address: string;
  gstn: string;
}

export interface ScheduleSourceOptionsResponse {
  options: ScheduleSourceComboboxOption[];
  hasNextPage: boolean;
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function fetchScheduleSources(
  supabase: SupabaseClient<Database>,
  params: ScheduleSourcesListParams,
  signal?: AbortSignal
): Promise<PaginationResponse<ScheduleSourceRow>> {
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('schedule_sources')
    .select('*', { count: 'exact' });

  if (params.search?.trim()) {
    const s = escapeIlike(params.search.trim());
    query = query.or(`name.ilike.%${s}%,display_name.ilike.%${s}%`);
  }

  const sortKey = (params.sortBy ?? 'display_name').trim();
  const ascending = params.order !== 'desc';
  query = query.order(sortKey, { ascending, nullsFirst: false });

  query = query.range(from, to);
  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error, count } = await query;
  if (error) {
    throw normalizeError(error);
  }

  const rows = (data ?? []) as ScheduleSourceRow[];
  const totalCount = count ?? 0;

  return {
    data: rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    hasPrevious: page > 1,
    hasNext: page * pageSize < totalCount,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

async function fetchScheduleSourceOptions(
  supabase: SupabaseClient<Database>,
  search: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<ScheduleSourceOptionsResponse> {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let q = supabase
    .from('schedule_sources')
    .select('id, name, display_name', { count: 'exact' })
    .order('display_name', { ascending: true });

  const trimmed = search.trim();
  if (trimmed) {
    const s = escapeIlike(trimmed);
    q = q.or(`name.ilike.%${s}%,display_name.ilike.%${s}%`);
  }

  q = q.range(from, from + pageSize - 1);
  if (signal) {
    q = q.abortSignal(signal);
  }

  const { data, error, count } = await q;
  if (error) {
    throw normalizeError(error);
  }

  const rows = (data ?? []) as ScheduleSourceOptionRow[];
  const total = count ?? 0;
  const options: ScheduleSourceComboboxOption[] = rows.map((row) => ({
    value: row.id,
    label: row.display_name || row.name,
    address: '',
    gstn: '',
  }));

  return {
    options,
    hasNextPage: page * pageSize < total,
  };
}

async function fetchScheduleSourcesList(
  supabase: SupabaseClient<Database>,
  filter: string,
  signal?: AbortSignal
): Promise<ScheduleSourceRow[]> {
  let q = supabase.from('schedule_sources').select('*').order('display_name');

  const trimmed = filter.trim();
  if (trimmed) {
    const s = escapeIlike(trimmed);
    q = q.or(`name.ilike.%${s}%,display_name.ilike.%${s}%`);
  }
  if (signal) {
    q = q.abortSignal(signal);
  }

  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  return (data ?? []) as ScheduleSourceRow[];
}

export { fetchScheduleSourceOptions, fetchScheduleSources, fetchScheduleSourcesList };
