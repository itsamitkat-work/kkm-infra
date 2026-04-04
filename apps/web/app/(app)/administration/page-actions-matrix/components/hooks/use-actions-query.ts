'use client';

import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { Action } from '@/types/actions';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useLocalQuery } from '@/hooks/use-local-query';

export const ACTIONS_TABLE_ID = 'actions';

export const fetchActions = async (
  page?: number,
  signal?: AbortSignal
): Promise<PaginationResponse<Action>> => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  const queryString = params.toString();
  const url = queryString ? `/v2/actions?${queryString}` : '/v2/actions';

  const response = await apiFetch<PaginationResponse<Action>>(url, { signal });

  return response;
};

type UseActionsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

const filterActions = (
  actions: Action[],
  search: string,
  filters: Record<string, Filter>
): Action[] => {
  let filtered = [...actions];

  const trimmedSearch = search?.trim().toLowerCase();
  if (trimmedSearch) {
    filtered = filtered.filter(
      (action) =>
        action.code?.toLowerCase().includes(trimmedSearch) ||
        action.description?.toLowerCase().includes(trimmedSearch)
    );
  }

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([, filter]) => {
      if (!filter.values || filter.values.length === 0) return;
      // Add custom filter logic here if needed
    });
  }

  return filtered;
};

export const useActionsQuery = ({
  search,
  filters,
  sorting,
}: UseActionsQueryParams) => {
  return useLocalQuery<Action>({
    queryKey: [ACTIONS_TABLE_ID, 'all'],
    fetchFn: fetchActions,
    search,
    filters,
    sorting,
    filterFn: filterActions,
  });
};
