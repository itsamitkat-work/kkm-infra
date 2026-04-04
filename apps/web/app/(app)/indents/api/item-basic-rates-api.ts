import { apiFetch } from '@/lib/apiClient';

export type ItemBasicRateRow = {
  basicRateId: string;
  indentQty: number;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
};

type ItemBasicRatesResponse = {
  isSuccess: boolean;
  data: ItemBasicRateRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export async function fetchItemBasicRates(
  projectId: string,
  projectItemId: string,
  type: string,
  signal?: AbortSignal
): Promise<ItemBasicRateRow[]> {
  const params = new URLSearchParams({ type });
  const path = `v2/${projectId}/basicrates/${projectItemId}?${params.toString()}`;
  const res = await apiFetch<ItemBasicRatesResponse>(path, { signal });
  return res?.data ?? [];
}
