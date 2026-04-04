import { apiFetch } from '@/lib/apiClient';
import { AttendanceReportResponse, AttendanceReportParams } from '../types';

export const ATTENDANCE_REPORT_QUERY_ID = 'attendance-report';

export async function fetchAttendanceReport(
  params: AttendanceReportParams,
  signal?: AbortSignal
): Promise<AttendanceReportResponse> {
  const queryParams = new URLSearchParams();

  // Add optional parameters only if they have values
  if (params.ReportNo) {
    queryParams.append('ReportNo', params.ReportNo.toString());
  }
  if (params.StartDate) {
    queryParams.append('StartDate', params.StartDate);
  }
  if (params.EndDate) {
    queryParams.append('EndDate', params.EndDate);
  }
  if (params.ExportType) {
    queryParams.append('ExportType', params.ExportType);
  }
  if (params.SuperviserId) {
    queryParams.append('SuperviserId', params.SuperviserId);
  }
  if (params.EmployeeId) {
    queryParams.append('EmployeeId', params.EmployeeId);
  }
  if (params.ProjectId) {
    queryParams.append('ProjectId', params.ProjectId);
  }
  if (params.ProjectHeadId) {
    queryParams.append('ProjectHeadId', params.ProjectHeadId);
  }
  if (params.ProjectEngineerId) {
    queryParams.append('ProjectEngineerId', params.ProjectEngineerId);
  }
  if (params.IsChecked !== undefined) {
    queryParams.append('IsChecked', params.IsChecked.toString());
  }
  if (params.IsVerified !== undefined) {
    queryParams.append('IsVerified', params.IsVerified.toString());
  }
  if (params.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params.pageSize) {
    queryParams.append('pageSize', params.pageSize.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `v2/attendance/reports?${queryString}`
    : 'v2/attendance/reports';

  return await apiFetch<AttendanceReportResponse>(url, {
    signal,
  });
}
