'use client';

import { fetchItems } from '@/hooks/items/items-api';
import type { InfiniteSelectOption } from '@/components/ui/infinite-select-filter';

const PAGE_SIZE = 20;

export async function fetchItemFilterOptions(
  search: string,
  page: number
): Promise<{ options: InfiniteSelectOption[]; hasNextPage: boolean }> {
  const response = await fetchItems(
    search,
    page,
    PAGE_SIZE,
    'name',
    [],
    {},
    undefined
  );

  const options: InfiniteSelectOption[] = response.data.map((item) => ({
    value: item.hashId,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));

  return {
    options,
    hasNextPage: response.hasNext,
  };
}
