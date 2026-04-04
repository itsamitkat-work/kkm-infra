import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { MasterItem } from '@/hooks/items/types';
import { useInfiniteQuery } from '@tanstack/react-query';

const fetchMasterProjectItems = async ({
  pageParam = 1,
  filters,
  schedule,
  signal,
}: {
  pageParam?: number;
  filters: { search?: string; searchField?: string };
  schedule?: string;
  signal?: AbortSignal;
}) => {
  const { search, searchField } = filters;
  const params = new URLSearchParams();
  params.append('page', pageParam.toString());
  params.append('pageSize', '10');
  if (schedule) {
    params.append('scheduleRate', schedule);
  }
  const field = searchField || 'name';
  if (search) {
    params.append(field, search);
  }

  const queryString = params.toString();
  const response = await apiFetch<PaginationResponse<MasterItem>>(
    `/v2/items/search?${queryString}`,
    { signal }
  );

  return response;
};

export const useMasterProjectItemsQuery = (
  filters: {
    search?: string;
    searchField?: string;
  },
  schedule?: string
) => {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery<PaginationResponse<MasterItem>>({
    queryKey: ['master-project-items', schedule, filters],
    queryFn: ({ pageParam, signal }) =>
      fetchMasterProjectItems({
        pageParam: pageParam as number,
        filters,
        schedule,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: Infinity,
  });

  const allItems = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    data: allItems,
    isLoading,
    isError: !!error,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    totalCount: data?.pages[0]?.totalCount ?? 0,
  };
};
