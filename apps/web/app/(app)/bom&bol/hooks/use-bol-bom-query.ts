'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchBolBomBoc, BolBomType } from '../api/bol-bom-api';
import { PaginationResponse } from '@/types/common';
import type { ProjectBoqLinesQueryScope } from '@/app/projects/[id]/estimation/types';

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

function normalizeBolBomItemScope(
  raw: string | null | undefined
): ProjectBoqLinesQueryScope {
  if (raw == null || raw === '' || raw === 'GEN') {
    return 'planned';
  }
  if (raw === 'estimation' || raw === 'EST') {
    return 'estimation';
  }
  if (raw === 'measurement' || raw === 'MSR') {
    return 'measurement';
  }
  if (raw === 'billing' || raw === 'BLG') {
    return 'billing';
  }
  return 'planned';
}

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
  const itemScope = normalizeBolBomItemScope(itemType);

  return useInfiniteQuery({
    queryKey: ['bol-bom-boc', projectId, apiType, itemScope],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchBolBomBoc(
        projectId!,
        apiType,
        itemScope,
        pageParam,
        signal
      ).then(mapPageToBillRows),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: Boolean(projectId),
  });
}
