'use client';

import * as React from 'react';
import { PaginationResponse } from '@/types/common';
import { PoolUser } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export const POOL_USERS_QUERY_ID = 'pool-users';

export const fetchAllPoolUsers = async (
  signal?: AbortSignal
): Promise<PaginationResponse<PoolUser>> => {
  // Load all users by requesting a very large page size
  // Since we want all data upfront for local filtering
  const params = new URLSearchParams({
    page: '1',
    pageSize: '10000', // Large number to get all users at once
  });

  return apiFetch<PaginationResponse<PoolUser>>(`v2/resource-pool?${params}`, {
    signal,
  });
};

export const usePoolUsersQuery = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [POOL_USERS_QUERY_ID],
    queryFn: ({ signal }) => fetchAllPoolUsers(signal),
    staleTime: Infinity,
  });

  const users = React.useMemo(() => {
    return query.data?.data ?? [];
  }, [query.data]);

  return {
    query,
    users,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [POOL_USERS_QUERY_ID] }),
  };
};
