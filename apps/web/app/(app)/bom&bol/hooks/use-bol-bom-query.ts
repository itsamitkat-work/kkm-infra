'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchBolBomBoc, BolBomType, BolBomItemType } from '../api/bol-bom-api';
import { PaginationResponse } from '@/types/common';

export type BillRow = {
  id: string;
  totalAmount: number;
  basicRateHashId: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
};

export const TAB_TO_API_TYPE: Record<string, BolBomType> = {
  bom: 'Material',
  bol: 'Labour',
  tp: 'Carrige',
};

function mapPageToBillRows(
  data: PaginationResponse<{ basicRateHashId: string; [key: string]: unknown }>
): PaginationResponse<BillRow> {
  return {
    ...data,
    data: data.data.map((row) => ({
      ...row,
      id: row.basicRateHashId,
    })) as BillRow[],
  };
}

export function useBolBomQuery(
  projectId: string | null,
  tab: string,
  itemType: string | null
) {
  const apiType = TAB_TO_API_TYPE[tab] ?? 'Material';
  const validItemType =
    itemType === 'GEN' || itemType === 'EST' || itemType === 'MSR'
      ? (itemType as BolBomItemType)
      : 'GEN';

  return useInfiniteQuery({
    queryKey: ['bol-bom-boc', projectId, apiType, validItemType],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchBolBomBoc(
        projectId!,
        apiType,
        validItemType,
        pageParam,
        signal
      ).then(mapPageToBillRows),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: Boolean(projectId),
  });
}
