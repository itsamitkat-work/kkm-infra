'use client';

import { useQuery } from '@tanstack/react-query';
export const ITEM_BY_ID_QUERY_KEY = 'item-by-id';

export function useItemById(hashId: string | undefined) {
  return useQuery({
    queryKey: [ITEM_BY_ID_QUERY_KEY, hashId],
    queryFn: ({ signal }) => fetchItemById(hashId!, signal),
    enabled: Boolean(hashId),
    staleTime: 0,
  });
}

import { apiFetch } from '@/lib/apiClient';
import { MasterItem } from '@/hooks/items/types';

export interface ItemByIdApiResponse {
  isSuccess: boolean;
  data: MasterItem;
  message?: string;
  statusCode?: number;
}

export async function fetchItemById(
  hashId: string,
  signal?: AbortSignal
): Promise<MasterItem> {
  const url = `v2/items/getbyid?hashId=${encodeURIComponent(hashId)}`;
  const res = await apiFetch<ItemByIdApiResponse>(url, { signal });
  if (!res.isSuccess || !res.data) {
    throw new Error(res.message ?? 'Failed to load item');
  }
  const d = res.data;
  return {
    ...res.data,
    subhead: d.subHead || d.subhead,
    subHead: d.subHead || d.subhead,
  };
}
