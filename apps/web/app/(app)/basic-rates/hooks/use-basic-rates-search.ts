'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchBasicRates } from '@/hooks/use-basic-rates';
import type { BasicRate } from '@/hooks/use-basic-rates';
import { useDebounce } from '@/hooks/use-debounce';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function useBasicRatesSearch(searchQuery: string, enabled = true) {
  const debouncedQuery = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS);

  const { data, isLoading } = useQuery({
    queryKey: ['basic-rates', 'search', 'material', debouncedQuery],
    queryFn: () =>
      fetchBasicRates({
        search: debouncedQuery,
        types: 'Material',
        page: 1,
        pageSize: PAGE_SIZE,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });

  const items: BasicRate[] = data?.data ?? [];

  return { items, isLoading };
}
