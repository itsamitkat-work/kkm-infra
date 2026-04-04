'use client';

import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useQueryClient } from '@tanstack/react-query';
import { fetchClients } from '@/hooks/clients/use-clients';
import { useInfiniteQuery } from '@tanstack/react-query';

export const CLIENTS_TABLE_ID = 'clients';

type UseClientsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useClientsQuery = ({
  search,
  filters,
  sorting,
}: UseClientsQueryParams) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [CLIENTS_TABLE_ID, search, filters, sorting],
    queryFn: ({ pageParam = 1 }) =>
      fetchClients({
        search,
        searchField: 'name',
        page: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.hasNext) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [CLIENTS_TABLE_ID] }),
  };
};
