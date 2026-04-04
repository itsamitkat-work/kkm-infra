import { dehydrate, QueryKey, QueryFunction } from '@tanstack/react-query';
import getQueryClient from './get-query-client';

interface PrefetchQuery {
  queryKey: QueryKey;
  queryFn: QueryFunction;
}

export async function getDehydratedState(queries: PrefetchQuery[]) {
  const queryClient = getQueryClient();

  await Promise.all(
    queries.map(({ queryKey, queryFn }) =>
      queryClient.prefetchQuery({ queryKey, queryFn })
    )
  );

  return dehydrate(queryClient);
}
