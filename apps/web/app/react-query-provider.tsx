'use client';

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from 'sonner';
import {
  basicRateDistinctUnitsLoadErrorMessage,
  isBasicRateDistinctUnitsQueryKey,
} from '@/hooks/use-basic-rate-distinct-units';

export function ReactQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => {
    const queryCache = new QueryCache({
      onError: (_error, query) => {
        if (isBasicRateDistinctUnitsQueryKey(query.queryKey)) {
          toast.error(basicRateDistinctUnitsLoadErrorMessage);
        }
      },
    });
    return new QueryClient({
      queryCache,
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: true,
          refetchOnMount: true,
          staleTime: 1000 * 60 * 5, // 5 minutes
        },
      },
    });
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TANSTACK_QUERY_CLIENT__ = client;
    }
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// This code is only for TypeScript
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}
