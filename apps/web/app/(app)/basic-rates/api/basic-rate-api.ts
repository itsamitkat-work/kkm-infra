import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import type { ScheduleSourceVersionRow } from '@/hooks/use-schedule-source-versions';
import { normalizeError } from '@/lib/supabase/errors';
import type { PaginationResponse } from '@/types/common';

import { fetchBasicRateTypeIdByName } from './basic-rate-type-api';

type BasicRatesTable = Database['public']['Tables']['basic_rates'];

type BasicRateTypeRow = Database['public']['Tables']['basic_rate_types']['Row'];

type BasicRate = BasicRatesTable['Row'] & {
  basic_rate_types: BasicRateTypeRow | null;
  schedule_source_versions: ScheduleSourceVersionRow | null;
};

type BasicRatesListParams = {
  search?: string;
  types?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  schedule_source_version_id?: string;
  statusIn?: Database['public']['Enums']['record_status'][];
};

type UpdateBasicRateInput = {
  id: string;
} & Partial<
  Pick<
    BasicRatesTable['Update'],
    'basic_rate_type_id' | 'code' | 'description' | 'unit' | 'rate' | 'status'
  >
>;

type CreateBasicRateInput = Omit<
  BasicRatesTable['Insert'],
  'id' | 'created_at' | 'updated_at'
>;

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME =
  'schedule_source_versions.display_name' as const;

/**
 * Offset pagination via `range`. For very large datasets, consider migrating to
 * cursor-based pagination (workspace standard) with a stable sort key.
 */
async function fetchBasicRates(
  supabase: SupabaseClient<Database>,
  params: BasicRatesListParams,
  signal?: AbortSignal
): Promise<PaginationResponse<BasicRate>> {
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
    const typeId = await fetchBasicRateTypeIdByName(
      supabase,
      params.types,
      signal
    );
    query = query.eq('basic_rate_type_id', typeId);
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

  query = query.range(from, to);
  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error, count } = await query;
  if (error) {
    throw normalizeError(error);
  }

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

async function createBasicRate(
  supabase: SupabaseClient<Database>,
  input: CreateBasicRateInput,
  signal?: AbortSignal
): Promise<void> {
  let query = supabase.from('basic_rates').insert(input);
  if (signal) {
    query = query.abortSignal(signal);
  }
  const { error } = await query;
  if (error) {
    throw normalizeError(error);
  }
}

async function updateBasicRate(
  supabase: SupabaseClient<Database>,
  input: UpdateBasicRateInput,
  signal?: AbortSignal
): Promise<void> {
  const { id, ...rest } = input;
  if (Object.keys(rest).length === 0) {
    return;
  }
  let query = supabase.from('basic_rates').update(rest).eq('id', id);
  if (signal) {
    query = query.abortSignal(signal);
  }
  const { error } = await query;
  if (error) {
    throw normalizeError(error);
  }
}

async function deleteBasicRate(
  supabase: SupabaseClient<Database>,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  let query = supabase.from('basic_rates').delete().eq('id', id);
  if (signal) {
    query = query.abortSignal(signal);
  }
  const { error } = await query;
  if (error) {
    throw normalizeError(error);
  }
}

export {
  BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME,
  fetchBasicRates,
  createBasicRate,
  updateBasicRate,
  deleteBasicRate,
};

export type {
  BasicRateTypeRow,
  BasicRate,
  BasicRatesListParams,
  UpdateBasicRateInput,
  CreateBasicRateInput,
};
