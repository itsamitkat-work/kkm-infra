import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export type IndentListItem = {
  indentCode: string;
  requestedDate: string;
  projectName: string;
  requestedBy: string | null;
};

export type IndentListParams = {
  projectHashId?: string;
  startDate?: string;
  endDate?: string;
  role?: string;
  /** Search by indent code (or other fields if supported by API). */
  search?: string;
};

export async function fetchIndents(
  params: IndentListParams & { page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<IndentListItem>> {
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
  return apiFetch<PaginationResponse<IndentListItem>>(
    `v2/indent${query ? `?${query}` : ''}`,
    { signal }
  );
}

export type IndentItemPayload = {
  /** For creating indent items */
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity?: number;
  makerId?: string;
  /** For check/verify updates */
  hashId?: string;
  checkerId?: string;
  verifierId?: string;
  isChecked?: number;
  isVerified?: number;
};

export type PostIndentResponse = {
  isSuccess: boolean;
  data: {
    total: number;
    success: number;
    failed: number;
  };
  message: string;
  statusCode: number;
};

export async function postIndent(
  items: IndentItemPayload[],
  signal?: AbortSignal
): Promise<PostIndentResponse> {
  return apiFetch<PostIndentResponse>('v2/indent', {
    method: 'POST',
    data: items,
    headers: {
      'Content-Type': 'application/json; v=2.0',
    },
    signal,
  });
}

export type IndentDetailItem = {
  itemName: string;
  materialName: string;
  quantity: number;
  isChecked: number;
  isVerified: number;
  status: string | null;
  indentDetailsHashId: string;
  basicRateHashId: string;
  projectItemHashId: string;
  projectHashId: string;
};

export type IndentDetailsParams = {
  role: string;
  indentCode: string;
};

export type IndentDetailsResponse = {
  isSuccess: boolean;
  data: IndentDetailItem[];
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export async function fetchIndentDetails(
  params: IndentDetailsParams,
  signal?: AbortSignal
): Promise<IndentDetailsResponse> {
  return apiFetch<IndentDetailsResponse>('v2/indent/details', {
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'application/json; v=2.0',
    },
    signal,
  });
}

export type IndentServiceListItem = {
  itemName: string;
  serviceItemQuantity: number;
  serviceItemCode: string;
  indentCode: string;
  requestedDate: string;
  projectName: string;
  requestedBy: string | null;
  projectHashId: string;
  indentServiceItemHashId: string;
  projectItemHashId: string;
};

export type IndentServiceListParams = IndentListParams;

export async function fetchIndentServiceItems(
  params: IndentServiceListParams & { page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<PaginationResponse<IndentServiceListItem>> {
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
  return apiFetch<PaginationResponse<IndentServiceListItem>>(
    `v2/indent/serviceitem${query ? `?${query}` : ''}`,
    { signal }
  );
}

const indentV2Headers = {
  'Content-Type': 'application/json; v=2.0',
} as const;

export type CreateIndentServiceItemPayload = {
  projectId?: string;
  projectItemId?: string;
  serviceItemCode: string;
  serviceItemQty: number;
  makerHashId: string;
};

export type UpdateIndentServiceItemPayload = {
  id: string;
  serviceItemCode: string;
  serviceItemQty: number;
  verifierHashId: string | undefined;
  checkerHashId: string | undefined;
  isChecked: number;
  isVerified: number;
};

export type IndentServiceItemApiResponse = {
  isSuccess: boolean;
  data?: unknown;
  message: string;
  statusCode: number;
};

export async function createIndentServiceItem(
  projectItemId: string,
  payload: CreateIndentServiceItemPayload,
  signal?: AbortSignal
): Promise<IndentServiceItemApiResponse> {
  const projectId = payload.projectId;
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiFetch<IndentServiceItemApiResponse>(
    `v2/indent/serviceitem/${encodeURIComponent(projectItemId)}${query}`,
    {
      method: 'POST',
      data: payload,
      headers: indentV2Headers,
      signal,
    }
  );
}

export async function updateIndentServiceItem(
  projectItemId: string,
  payload: UpdateIndentServiceItemPayload,
  signal?: AbortSignal,
  projectId?: string
): Promise<IndentServiceItemApiResponse> {
  const query = projectId
    ? `?projectId=${encodeURIComponent(projectId)}`
    : '';
  return apiFetch<IndentServiceItemApiResponse>(
    `v2/indent/serviceitem/${encodeURIComponent(projectItemId)}${query}`,
    {
      method: 'PUT',
      data: payload,
      headers: indentV2Headers,
      signal,
    }
  );
}
