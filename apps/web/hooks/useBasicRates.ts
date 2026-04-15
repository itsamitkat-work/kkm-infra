'use client';

import * as React from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import type { Database } from '@kkm/db';
import type { ScheduleSourceVersionRow } from '@/hooks/use-schedule-source-versions';

export type BasicRateTypeRow =
  Database['public']['Tables']['basic_rate_types']['Row'];

type BasicRates = Database['public']['Tables']['basic_rates'];

export type BasicRate = BasicRates['Row'] & {
  basic_rate_types: BasicRateTypeRow | null;
  schedule_source_versions: ScheduleSourceVersionRow | null;
};

export const BASIC_RATES_QUERY_KEY = 'basic-rates';

export const BASIC_RATES_TABLE_ID = BASIC_RATES_QUERY_KEY;

function getSupabase() {
  return createSupabaseBrowserClient();
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME =
  'schedule_source_versions.display_name' as const;

export type BasicRatesListParams = {
  search?: string;
  types?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  schedule_source_version_id?: string;
  statusIn?: Database['public']['Enums']['record_status'][];
};

export async function fetchBasicRates(
  params: BasicRatesListParams
): Promise<PaginationResponse<BasicRate>> {
  const supabase = getSupabase();
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('basic_rates').select(
    `
      id,
      schedule_source_version_id,
      basic_rate_type_id,
      code,
      description,
      unit,
      rate,
      status,
      basic_rate_types ( name ),
      schedule_source_versions ( display_name, name )
    `,
    { count: 'exact' }
  );

  if (params.schedule_source_version_id) {
    query = query.eq(
      'schedule_source_version_id',
      params.schedule_source_version_id
    );
  }

  if (params.types) {
    const { data: typeRow, error: typeLookupError } = await supabase
      .from('basic_rate_types')
      .select('id')
      .eq('name', params.types)
      .single();
    if (typeLookupError) throw typeLookupError;
    query = query.eq('basic_rate_type_id', typeRow.id);
  }

  if (params.statusIn && params.statusIn.length > 0) {
    query = query.in('status', params.statusIn);
  }

  if (params.search) {
    const s = escapeIlike(params.search);
    query = query.or(`code.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const sortKey = params.sortBy ?? 'code';
  const ascending = params.order !== 'desc';
  const [rel, relCol] = sortKey.split('.');
  if (
    rel === 'schedule_source_versions' &&
    (relCol === 'display_name' || relCol === 'name')
  ) {
    query = query.order(relCol, {
      ascending,
      nullsFirst: false,
      foreignTable: 'schedule_source_versions',
    });
  } else {
    query = query.order(sortKey, { ascending, nullsFirst: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as BasicRate[];
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

function invalidateBasicRatesQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: [BASIC_RATES_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: ['basic-rate-types'] });
}

export function useBasicRatesQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: BasicRatesListParams = React.useMemo(() => {
    const out: BasicRatesListParams = { search: params.search };
    params.filters.forEach((filter) => {
      if (filter.field === 'types' && filter.values.length > 0) {
        out.types = filter.values[0] as string;
      }
      if (
        filter.field === 'schedule_source_version_id' &&
        filter.values.length > 0
      ) {
        out.schedule_source_version_id = String(filter.values[0]);
      }
      if (
        filter.field === 'status' &&
        filter.values.length > 0 &&
        (filter.operator === 'is_any_of' || filter.operator === 'is')
      ) {
        out.statusIn = filter.values.map(String) as Database['public']['Enums']['record_status'][];
      }
    });
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: [BASIC_RATES_QUERY_KEY, listParams],
    queryFn: ({ pageParam = 1 }) =>
      fetchBasicRates({
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
      queryClient.invalidateQueries({ queryKey: [BASIC_RATES_QUERY_KEY] }),
  };
}

export function useBasicRateTypeOptions() {
  return useQuery({
    queryKey: ['basic-rate-types', 'options'],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('basic_rate_types')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useBasicRatesSearch(searchQuery: string, enabled = true) {
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data, isLoading } = useQuery({
    queryKey: [BASIC_RATES_QUERY_KEY, 'search', debouncedQuery],
    queryFn: () =>
      fetchBasicRates({
        search: debouncedQuery,
        page: 1,
        pageSize: 20,
      }),
    enabled: enabled && debouncedQuery.length > 0,
    placeholderData: (prev) => prev,
  });
  const items = data?.data ?? [];
  return { items, isLoading };
}

async function createBasicRateApi(
  input: Omit<BasicRates['Insert'], 'id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('basic_rates').insert(input);
  if (error) throw error;
}

async function updateBasicRateApi(
  input: Pick<
    BasicRates['Row'],
    | 'id'
    | 'basic_rate_type_id'
    | 'code'
    | 'description'
    | 'unit'
    | 'rate'
    | 'status'
  >
): Promise<void> {
  const supabase = getSupabase();
  const { id, ...rest } = input;
  const { error } = await supabase.from('basic_rates').update(rest).eq('id', id);
  if (error) throw error;
}

export type CreateBasicRateInput = Parameters<typeof createBasicRateApi>[0];
export type UpdateBasicRateInput = Parameters<typeof updateBasicRateApi>[0];

async function deleteBasicRateApi(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('basic_rates').delete().eq('id', id);
  if (error) throw error;
}

export function useCreateBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBasicRateApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate created.'),
    onSettled: () => invalidateBasicRatesQueries(queryClient),
  });
}

export function useUpdateBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBasicRateApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate updated.'),
    onSettled: () => invalidateBasicRatesQueries(queryClient),
  });
}

export function useDeleteBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBasicRateApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate deleted.'),
    onSettled: () => invalidateBasicRatesQueries(queryClient),
  });
}

export function formStatusLabelToDb(
  label: string
): Database['public']['Enums']['record_status'] {
  if (label === 'Active') return 'active';
  if (label === 'Inactive') return 'inactive';
  if (label === 'Deprecated') return 'deprecated';
  throw new Error(`Unexpected basic rate status label: ${label}`);
}
