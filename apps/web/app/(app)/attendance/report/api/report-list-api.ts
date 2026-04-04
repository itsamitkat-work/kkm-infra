import { apiFetch } from '@/lib/apiClient';
import { ReportTypeResponse, ReportTypeItem } from '../types';
import { PaginationResponse } from '@/types/common';

export const REPORT_TYPES_QUERY_ID = 'attendance-report-types';

export async function fetchReportTypes(
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<ReportTypeItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: '20',
  });

  const response = await apiFetch<ReportTypeResponse>(
    `v2/attendance/reportlist?${params.toString()}`,
    { signal }
  );

  // Convert to PaginationResponse format
  return {
    data: response.data,
    totalCount: response.totalCount,
    page: response.page,
    pageSize: response.pageSize,
    totalPages: response.totalPages,
    hasPrevious: response.hasPrevious,
    hasNext: response.hasNext,
    isSuccess: response.isSuccess,
    statusCode: response.statusCode,
    message: response.message,
  };
}
