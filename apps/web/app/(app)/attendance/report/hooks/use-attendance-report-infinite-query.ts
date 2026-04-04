'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import {
  fetchAttendanceReport,
  ATTENDANCE_REPORT_QUERY_ID,
} from '../api/report-api';
import type {
  AttendanceReportParams,
  AttendanceReportRecord,
  AttendanceReportRecordType1,
  AttendanceReportRecordType2,
  AttendanceReportRecordType3,
  AttendanceReportRecordType4,
  AttendanceReportRecordType5,
} from '../types';
import { PaginationResponse } from '@/types/common';

// Type guards
function isType1(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType1 {
  return 'employeeName' in record;
}

function isType2(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType2 {
  return 'months' in record && 'projectName' in record && 'employee' in record;
}

function isType3(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType3 {
  return 'years' in record && 'projectName' in record && 'hours' in record;
}

function isType4(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType4 {
  return (
    'date' in record &&
    'project' in record &&
    'employee' in record &&
    'att' in record
  );
}

function isType5(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType5 {
  return (
    'months' in record &&
    'projectName' in record &&
    'designation' in record &&
    'hours' in record &&
    typeof (record as AttendanceReportRecordType5).days === 'number'
  );
}

// Generate unique ID for a record based on its structure
function generateRecordId(record: AttendanceReportRecord): string {
  if (isType1(record)) {
    return record.employeeName;
  }
  if (isType2(record)) {
    return `${record.months}-${record.projectName}-${record.employee}`;
  }
  if (isType3(record)) {
    return `${record.years}-${record.projectName}-${record.designation || 'null'}`;
  }
  if (isType4(record)) {
    return `${record.date}-${record.project}-${record.employee}`;
  }
  if (isType5(record)) {
    return `${record.months}-${record.projectName}-${record.designation}`;
  }
  return JSON.stringify(record);
}

// Transform records to include id field for DataTable
function transformRecords(
  records: AttendanceReportRecord[]
): AttendanceReportRecord[] {
  return records.map((record) => ({
    ...record,
    id: generateRecordId(record),
  }));
}

// API function to fetch a single page
export const fetchAttendanceReportPage = async (
  params: AttendanceReportParams,
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<AttendanceReportRecord>> => {
  const pageParams: AttendanceReportParams = {
    ...params,
    page,
    pageSize: params.pageSize || 20,
  };
  const response = await fetchAttendanceReport(pageParams, signal);

  // Transform records to include id field for DataTable
  const transformedData = transformRecords(response.data);

  return {
    data: transformedData,
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
};

type UseAttendanceReportQueryParams = {
  params: AttendanceReportParams;
  search?: string;
  filters?: Filter[];
  sorting?: SortingState;
  enabled?: boolean;
};

export const useAttendanceReportInfiniteQuery = ({
  params,
  search,
  filters,
  sorting,
  enabled = true,
}: UseAttendanceReportQueryParams) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [ATTENDANCE_REPORT_QUERY_ID, params, search, filters, sorting],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchAttendanceReportPage(params, pageParam as number, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!params.ReportNo,
    staleTime: 0, // Always fetch fresh data
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: [ATTENDANCE_REPORT_QUERY_ID],
      }),
  };
};

export const ATTENDANCE_REPORT_TABLE_ID = 'attendance-report';
