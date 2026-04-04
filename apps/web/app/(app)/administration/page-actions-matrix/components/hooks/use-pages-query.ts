'use client';

import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useLocalQuery } from '@/hooks/use-local-query';

export interface Page extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export const PAGES_TABLE_ID = 'pages';

export const fetchPages = async (
  page?: number,
  signal?: AbortSignal
): Promise<PaginationResponse<Page>> => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  const queryString = params.toString();
  const url = queryString ? `/v2/pages?${queryString}` : '/v2/pages';

  const response = await apiFetch<PaginationResponse<Page>>(url, { signal });

  return response;
};

type UsePagesQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

const filterPages = (
  services: Page[],
  search: string,
  filters: Record<string, Filter>
): Page[] => {
  let filtered = [...services];

  const trimmedSearch = search?.trim().toLowerCase();
  if (trimmedSearch) {
    filtered = filtered.filter(
      (service) =>
        service.name?.toLowerCase().includes(trimmedSearch) ||
        service.code?.toLowerCase().includes(trimmedSearch) ||
        service.description?.toLowerCase().includes(trimmedSearch)
    );
  }

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (!filter.values || filter.values.length === 0) return;

      switch (key) {
        case 'isActive':
          const activeValues = filter.values.map((v) =>
            String(v).toLowerCase()
          );
          filtered = filtered.filter((service) =>
            activeValues.includes(String(service.isActive).toLowerCase())
          );
          break;
        default:
          break;
      }
    });
  }

  return filtered;
};

export const usePagesQuery = ({
  search,
  filters,
  sorting,
}: UsePagesQueryParams) => {
  return useLocalQuery<Page>({
    queryKey: [PAGES_TABLE_ID, 'all'],
    fetchFn: fetchPages,
    search,
    filters,
    sorting,
    filterFn: filterPages,
  });
};
