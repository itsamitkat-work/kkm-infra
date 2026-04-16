'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const basicRateDistinctUnitsQueryKey = ['basic-rate-units'] as const;

export const basicRateDistinctUnitsLoadErrorMessage =
  'Could not load units. You can still type a custom unit.';

export function isBasicRateDistinctUnitsQueryKey(
  queryKey: readonly unknown[]
): boolean {
  return (
    queryKey.length >= 1 &&
    queryKey[0] === basicRateDistinctUnitsQueryKey[0]
  );
}

const DEFAULT_STALE_TIME_MS = Number.POSITIVE_INFINITY;
const DEFAULT_GC_TIME_MS = 30 * 60 * 1000;

function getSupabase() {
  return createSupabaseBrowserClient();
}

export function normalizeBasicRateDistinctUnitsPayload(
  data: unknown
): string[] {
  if (data == null) return [];
  const list = Array.isArray(data) ? data : [data];
  return [...new Set(list.map(String))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export async function fetchBasicRateDistinctUnits(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_basic_rate_distinct_units');
  if (error) throw error;
  return normalizeBasicRateDistinctUnitsPayload(data);
}

export function invalidateBasicRateDistinctUnitsQueries(
  queryClient: QueryClient
): void {
  queryClient.invalidateQueries({ queryKey: basicRateDistinctUnitsQueryKey });
}

export type UseBasicRateDistinctUnitsOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export function useBasicRateDistinctUnits(
  options: UseBasicRateDistinctUnitsOptions = {}
) {
  const {
    enabled = true,
    staleTime = DEFAULT_STALE_TIME_MS,
    gcTime = DEFAULT_GC_TIME_MS,
  } = options;

  return useQuery({
    queryKey: basicRateDistinctUnitsQueryKey,
    queryFn: fetchBasicRateDistinctUnits,
    enabled,
    staleTime,
    gcTime,
    retry: false,
  });
}
