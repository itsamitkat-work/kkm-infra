'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAttendanceReport,
  ATTENDANCE_REPORT_QUERY_ID,
} from '../api/report-api';
import type { AttendanceReportParams } from '../types';

export function useAttendanceReportQuery(params: AttendanceReportParams) {
  return useQuery({
    queryKey: [ATTENDANCE_REPORT_QUERY_ID, params],
    queryFn: ({ signal }) => fetchAttendanceReport(params, signal),
    enabled: !!(params.StartDate && params.EndDate) && !!params.ReportNo, // Only fetch when date range is provided
    staleTime: 0, // Always fetch fresh data
  });
}
