'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchBasicRateTypeOptions } from '../api/basic-rate-type-api';

import { BASIC_RATE_QUERY_KEY_PREFIX } from './use-basic-rates-query';

function useBasicRateTypesQuery() {
  return useQuery({
    queryKey: [
      ...BASIC_RATE_QUERY_KEY_PREFIX,
      'basic-rate-type',
      'options',
    ] as const,
    queryFn: ({ signal }) =>
      fetchBasicRateTypeOptions(createSupabaseBrowserClient(), signal),
    staleTime: 60 * 60 * 1000,
  });
}

export { useBasicRateTypesQuery };
