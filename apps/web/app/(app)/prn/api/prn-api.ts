import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

const prnV2Headers = {
  'Content-Type': 'application/json; v=2.0',
} as const;

// ─── PRN List (GET /api/v2/prn) ───

export type PrnListItem = {
  prnCode: string;
};

export type PrnListParams = {
  projectHashId?: string;
  startDate?: string;
  endDate?: string;
  role?: string;
  search?: string;
};

export async function fetchPrns(
  params: PrnListParams & { page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnListItem>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.role) searchParams.set('role', params.role);
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnListItem>>(
    `v2/prn${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Details by prnCode (GET /api/v2/prn/{prnCode}) ───

export type PrnDetailItem = {
  itemName: string;
  materialName: string;
  quantity: number;
  isChecked: number;
  isVerified: number;
  status: string | null;
  prnDetailsHashId: string;
  basicRateHashId: string;
  projectItemHashId: string;
  projectHashId: string;
};

export type PrnDetailsResponse = {
  isSuccess: boolean;
  data: PrnDetailItem[];
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export async function fetchPrnDetails(
  prnCode: string,
  signal?: AbortSignal
): Promise<PrnDetailsResponse> {
  return apiFetch<PrnDetailsResponse>(
    `v2/prn/${encodeURIComponent(prnCode)}`,
    { signal }
  );
}

// ─── Bulk Create PRN (POST /api/v2/prn) ───

export type PrnItemPayload = {
  hashId?: string;
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity?: number;
  checkerHashID?: string;
  verifierHashID?: string;
  isVerified?: number;
  isChecked?: number;
  createdBy?: string;
  updatedBy?: string;
  remark?: string;
  materialReceiverID?: number;
  factor?: string;
};

export type PostPrnResponse = {
  isSuccess: boolean;
  data: {
    total: number;
    success: number;
    failed: number;
  };
  message: string;
  statusCode: number;
};

export async function postPrn(
  items: PrnItemPayload[],
  signal?: AbortSignal
): Promise<PostPrnResponse> {
  return apiFetch<PostPrnResponse>('v2/prn', {
    method: 'POST',
    data: items,
    headers: prnV2Headers,
    signal,
  });
}

// ─── Bulk Delete PRN (DELETE /api/v2/prn) ───

export type DeletePrnPayload = {
  hashId: string;
};

export type DeletePrnResponse = {
  isSuccess: boolean;
  message: string;
  statusCode: number;
};

export async function deletePrn(
  items: DeletePrnPayload[],
  signal?: AbortSignal
): Promise<DeletePrnResponse> {
  return apiFetch<DeletePrnResponse>('v2/prn', {
    method: 'DELETE',
    data: items,
    headers: prnV2Headers,
    signal,
  });
}

// ─── PRN Indent Project Items (GET /api/v2/prn/indent/projectitem) ───

export type PrnIndentProjectItem = {
  itemName: string;
  quantity: number;
  projectItemHashId: string;
  itemCode: string;
};

export async function fetchPrnIndentProjectItems(
  params: { projectHashId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnIndentProjectItem>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnIndentProjectItem>>(
    `v2/prn/indent/projectitem${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Indent Project Item Basic Rates (GET /api/v2/prn/indent/projectitem/basicrate) ───

export type PrnIndentProjectItemBasicRate = {
  itemName: string;
  quantity: number;
  materialName: string;
  basicRateHashId: string;
  projectItemHashId: string;
  projectHashId: string;
};

export async function fetchPrnIndentProjectItemBasicRates(
  params: {
    projectHashId?: string;
    projectItemHashId?: string;
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnIndentProjectItemBasicRate>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.projectItemHashId)
    searchParams.set('projectItemHashId', params.projectItemHashId);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnIndentProjectItemBasicRate>>(
    `v2/prn/indent/projectitem/basicrate${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Indent Basic Rates (GET /api/v2/prn/indent/basicrate) ───

export type PrnIndentBasicRate = {
  quantity: number;
  materialName: string;
  basicRateHashId: string;
  basicRateCode: string;
};

export async function fetchPrnIndentBasicRates(
  params: { projectHashId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnIndentBasicRate>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnIndentBasicRate>>(
    `v2/prn/indent/basicrate${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Indent Basic Rate by Project Item (GET /api/v2/prn/indent/basicrate/projectitem) ───

export type PrnIndentBasicRateByProjectItem = {
  quantity: number;
  materialName: string;
  basicRateHashId: string;
};

export async function fetchPrnIndentBasicRatesByProjectItem(
  params: {
    projectHashId?: string;
    projectItemHashId?: string;
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnIndentBasicRateByProjectItem>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.projectItemHashId)
    searchParams.set('projectItemHashId', params.projectItemHashId);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnIndentBasicRateByProjectItem>>(
    `v2/prn/indent/basicrate/projectitem${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Indent Service Items (GET /api/v2/prn/indent/service-item) ───

export type PrnIndentServiceItem = {
  projectitemhashId: string;
  serviceItemCode: string;
  projectItemCode: string;
  projectItemName: string;
  serviceItemName: string;
  usedQty: number;
  indQty: number;
};

export async function fetchPrnIndentServiceItems(
  params: { projectHashId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnIndentServiceItem>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnIndentServiceItem>>(
    `v2/prn/indent/service-item${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Service Items (GET /api/v2/prn/service-item) ───

export type PrnServiceItem = {
  ID: string;
  ProjectId: number;
  ProjectitemId: number;
  projectItemCode: string;
  projectItemName: string;
  serviceItemCode: string;
  serviceItemName: string;
  Quantity: number;
  createdOn: string | null;
};

export type PrnServiceListItem = {
  ID: string;
  projectItemCode: string;
  projectItemName: string;
  serviceItemCode: string;
  serviceItemName: string;
  Quantity: number;
  createdOn: string | null;
};

export type PrnServiceListParams = PrnListParams;

export async function fetchPrnServiceItems(
  params: PrnServiceListParams & { page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<PrnServiceListItem>> {
  const searchParams = new URLSearchParams();
  if (params.projectHashId)
    searchParams.set('projectHashId', params.projectHashId);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.role) searchParams.set('role', params.role);
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiFetch<PaginationResponse<PrnServiceListItem>>(
    `v2/prn/service-item${query ? `?${query}` : ''}`,
    { signal }
  );
}

// ─── PRN Service Item by ID (GET /api/v2/prn/service-item/{id}) ───

export async function fetchPrnServiceItemById(
  id: string,
  signal?: AbortSignal
): Promise<PrnDetailsResponse> {
  return apiFetch<PrnDetailsResponse>(
    `v2/prn/service-item/${encodeURIComponent(id)}`,
    { signal }
  );
}

// ─── Create PRN Service Item (POST /api/v2/prn/service-item) ───

export type CreatePrnServiceItemPayload = {
  projectHashId: string;
  projectItemHashId: string;
  makerHashId: string;
  userItemCode: string;
  userRequestedQuantity: number;
};

export type PrnServiceItemApiResponse = {
  isSuccess: boolean;
  data?: unknown;
  message: string;
  statusCode: number;
};

export async function createPrnServiceItem(
  payload: CreatePrnServiceItemPayload,
  signal?: AbortSignal
): Promise<PrnServiceItemApiResponse> {
  return apiFetch<PrnServiceItemApiResponse>('v2/prn/service-item', {
    method: 'POST',
    data: payload,
    headers: prnV2Headers,
    signal,
  });
}

// ─── Update PRN Service Item (PUT /api/v2/prn/service-item) ───

export type UpdatePrnServiceItemPayload = {
  id: string;
  projectHashId: string;
  projectItemHashId: string;
  makerHashId: string;
  checkerHashID?: string;
  verifierHashID?: string;
  isVerified?: number;
  isChecked?: number;
  userItemCode: string;
  userRequestedQuantity: number;
};

export async function updatePrnServiceItem(
  payload: UpdatePrnServiceItemPayload,
  signal?: AbortSignal
): Promise<PrnServiceItemApiResponse> {
  return apiFetch<PrnServiceItemApiResponse>('v2/prn/service-item', {
    method: 'PUT',
    data: payload,
    headers: prnV2Headers,
    signal,
  });
}

// ─── Delete PRN Service Item (DELETE /api/v2/prn/service-item/{id}) ───

export async function deletePrnServiceItem(
  id: string,
  signal?: AbortSignal
): Promise<PrnServiceItemApiResponse> {
  return apiFetch<PrnServiceItemApiResponse>(
    `v2/prn/service-item/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: prnV2Headers,
      signal,
    }
  );
}
