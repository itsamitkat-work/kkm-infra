'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@kkm/db';
import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';

export type ScheduleSourceRow =
  Database['public']['Tables']['schedule_sources']['Row'];

function getSupabase() {
  return createSupabaseBrowserClient();
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const SCHEDULE_SOURCES_TABLE_ID = 'schedule-sources';

export type ScheduleSourcesListParams = {
  search?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchScheduleSources(
  params: ScheduleSourcesListParams
): Promise<PaginationResponse<ScheduleSourceRow>> {
  const supabase = getSupabase();
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

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

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

export async function fetchScheduleSourceOptions(
  search: string,
  page: number = 1
): Promise<ScheduleSourceOptionsResponse> {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const supabase = getSupabase();
  let q = supabase
    .from('schedule_sources')
    .select('id, name, display_name', { count: 'exact' })
    .order('display_name', { ascending: true });

  const trimmed = search.trim();
  if (trimmed) {
    const s = escapeIlike(trimmed);
    q = q.or(`name.ilike.%${s}%,display_name.ilike.%${s}%`);
  }

  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw error;

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

export async function fetchScheduleSourcesList(
  filter: string
): Promise<ScheduleSourceRow[]> {
  const supabase = getSupabase();
  let q = supabase.from('schedule_sources').select('*').order('display_name');

  const trimmed = filter.trim();
  if (trimmed) {
    const s = escapeIlike(trimmed);
    q = q.or(`name.ilike.%${s}%,display_name.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ScheduleSourceRow[];
}

export function useScheduleSourcesList(filter: string) {
  return useQuery({
    queryKey: [SCHEDULE_SOURCES_TABLE_ID, 'list', filter],
    queryFn: () => fetchScheduleSourcesList(filter),
    staleTime: 30 * 1000,
  });
}

export function useScheduleSourcesForFilters() {
  return useQuery({
    queryKey: [SCHEDULE_SOURCES_TABLE_ID, 'filter-labels'],
    queryFn: () => fetchScheduleSourcesList(''),
    staleTime: 60 * 1000,
  });
}

export function useScheduleSourcesQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ScheduleSourcesListParams = React.useMemo(() => {
    const out: ScheduleSourcesListParams = { search: params.search };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.sorting, params.filters]);

  const query = useInfiniteQuery({
    queryKey: [SCHEDULE_SOURCES_TABLE_ID, listParams, params.filters],
    queryFn: ({ pageParam = 1 }) =>
      fetchScheduleSources({
        ...listParams,
        page: pageParam as number,
        pageSize: 20,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [SCHEDULE_SOURCES_TABLE_ID] }),
  };
}
