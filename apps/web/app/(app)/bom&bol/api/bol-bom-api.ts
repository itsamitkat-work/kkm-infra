import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export type BolBomType = 'Material' | 'Labour' | 'Carrige';
export type BolBomItemType = 'GEN' | 'EST' | 'MSR';

export type BolBomRow = {
  totalAmount: number;
  basicRateHashId: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
};

type BolBomApiResponse = PaginationResponse<BolBomRow>;

const PAGE_SIZE = 50;

export async function fetchBolBomBoc(
  projectId: string,
  type: BolBomType,
  itemType: BolBomItemType,
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<BolBomRow>> {
  const params = new URLSearchParams();
  params.append('type', type);
  params.append('itemType', itemType);
  params.append('page', page.toString());
  params.append('pageSize', PAGE_SIZE.toString());

  const path = `v2/${projectId}/bol-bom-boc?${params.toString()}`;
  return apiFetch<BolBomApiResponse>(path, { signal });
}

export type ProjectItemBreakdownRow = {
  projectItemId: string;
  itemCode: string;
  itemName: string;
  indentQty: number;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
};

type ProjectItemBreakdownResponse = PaginationResponse<ProjectItemBreakdownRow>;

const BREAKDOWN_PAGE_SIZE = 50;

export async function fetchProjectItemBreakdown(
  projectId: string,
  code: string,
  type: BolBomType,
  itemType: BolBomItemType,
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<ProjectItemBreakdownRow>> {
  const params = new URLSearchParams();
  params.append('type', type);
  params.append('itemType', itemType);
  params.append('page', page.toString());
  params.append('pageSize', BREAKDOWN_PAGE_SIZE.toString());
  const path = `v2/${projectId}/projectitems/${encodeURIComponent(code)}?${params.toString()}`;
  return apiFetch<ProjectItemBreakdownResponse>(path, { signal });
}
