'use client';

import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useLocalQuery } from '@/hooks/use-local-query';

export const PAGE_ACTIONS_TABLE_ID = 'page-actions';

export interface PageAction extends Record<string, unknown> {
  id: string;
  pageId: string;
  actionId: string;
  pageCode: string;
  pageName: string;
  pageDescription: string | null;
  actionCode: string;
  actionDescription: string | null;
}

export const fetchPageActions = async (
  page?: number,
  signal?: AbortSignal
): Promise<PaginationResponse<PageAction>> => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  const queryString = params.toString();
  const url = queryString
    ? `/v2/pageactions?${queryString}`
    : '/v2/pageactions';

  const response = await apiFetch<PaginationResponse<PageAction>>(url, {
    signal,
  });

  return response;
};

type UsePageActionsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

const filterPageActions = (
  pageActions: PageAction[],
  search: string,
  filters: Record<string, Filter>
): PageAction[] => {
  let filtered = [...pageActions];

  const trimmedSearch = search?.trim().toLowerCase();
  if (trimmedSearch) {
    filtered = filtered.filter(
      (pageAction) =>
        pageAction.pageName?.toLowerCase().includes(trimmedSearch) ||
        pageAction.pageCode?.toLowerCase().includes(trimmedSearch) ||
        pageAction.actionCode?.toLowerCase().includes(trimmedSearch) ||
        pageAction.pageDescription?.toLowerCase().includes(trimmedSearch) ||
        pageAction.actionDescription?.toLowerCase().includes(trimmedSearch)
    );
  }

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (!filter.values || filter.values.length === 0) return;

      switch (key) {
        case 'pageId':
          const pageIdValues = filter.values.map((v) => String(v));
          filtered = filtered.filter((pageAction) =>
            pageIdValues.includes(pageAction.pageId)
          );
          break;
        case 'pageCode':
          const pageCodeValues = filter.values.map((v) =>
            String(v).toLowerCase()
          );
          filtered = filtered.filter((pageAction) =>
            pageCodeValues.includes(pageAction.pageCode?.toLowerCase())
          );
          break;
        case 'actionCode':
          const actionCodeValues = filter.values.map((v) =>
            String(v).toLowerCase()
          );
          filtered = filtered.filter((pageAction) =>
            actionCodeValues.includes(pageAction.actionCode?.toLowerCase())
          );
          break;
        default:
          break;
      }
    });
  }

  return filtered;
};

export const usePageActionsQuery = ({
  search,
  filters,
  sorting,
}: UsePageActionsQueryParams) => {
  return useLocalQuery<PageAction>({
    queryKey: [PAGE_ACTIONS_TABLE_ID, 'all'],
    fetchFn: fetchPageActions,
    search,
    filters,
    sorting,
    filterFn: filterPageActions,
  });
};
