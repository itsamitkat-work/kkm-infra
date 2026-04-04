'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchItems } from './items-api';
import type { MasterItem } from '@/hooks/items/types';
import { useDebounce } from '@/hooks/use-debounce';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function useItemsSearch(searchQuery: string) {
  const debouncedQuery = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS);

  const { data, isLoading } = useQuery({
    queryKey: ['items', 'search', debouncedQuery],
    queryFn: ({ signal }) =>
      fetchItems(debouncedQuery, 1, PAGE_SIZE, 'name', [], {}, signal),
    enabled: true,
    placeholderData: (prev) => prev,
  });

  const items: MasterItem[] = data?.data ?? [];

  return { items, isLoading };
}
