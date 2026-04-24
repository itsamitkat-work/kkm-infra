'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchClientDetail } from '../api/client-api';

import { CLIENTS_QUERY_KEY_PREFIX } from './use-clients-query';

function clientDetailQueryKey(clientId: string | undefined) {
  return [...CLIENTS_QUERY_KEY_PREFIX, 'detail', clientId] as const;
}

function useClient(clientId: string | undefined) {
  const query = useQuery({
    queryKey: clientDetailQueryKey(clientId),
    queryFn: ({ signal }) =>
      fetchClientDetail(createSupabaseBrowserClient(), clientId!, signal),
    enabled: Boolean(clientId),
    staleTime: Infinity,
  });

  return {
    client: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export { clientDetailQueryKey, useClient };
