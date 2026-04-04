import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AttendanceRow } from '../types';
import { ATTENDANCE_TABLE_ID } from '../api/attendance-api';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import * as React from 'react';

// Query key for attendance data
export function getAttendanceQueryKey(date: string, userId: string) {
  return [ATTENDANCE_TABLE_ID, date, userId];
}

// Generate unique ID for attendance row
function generateUniqueId(
  empId: string | null | undefined,
  projectId: string | null | undefined
): string {
  const safeEmpId = empId || 'unknown-emp';
  const safeProjectId = projectId || 'unknown-proj';
  return `${safeEmpId}#${safeProjectId}`;
}

// Transform API response to include uniqueId and deduplicate
function transformAttendanceData(data: AttendanceRow[]): AttendanceRow[] {
  const uniqueMap = new Map<string, AttendanceRow>();

  data.forEach((item) => {
    const uniqueId = generateUniqueId(item.empId, item.projectId);
    uniqueMap.set(uniqueId, { ...item, uniqueId });
  });

  return Array.from(uniqueMap.values());
}

// Hook to fetch attendance data from server
function useAttendanceQuery(date: string, userId: string | undefined) {
  return useQuery({
    queryKey: getAttendanceQueryKey(date, userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '10000',
      });

      const response = await apiFetch<PaginationResponse<AttendanceRow>>(
        `v2/attendance/${userId}/${date}?${queryParams.toString()}`
      );

      return transformAttendanceData(response.data || []);
    },
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Type for the attendance data hook return value
export interface AttendanceDataHook {
  workers: AttendanceRow[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateRow: (
    uniqueId: string,
    updater: (row: AttendanceRow) => AttendanceRow
  ) => void;
  insertRow: (newRow: AttendanceRow) => void;
  deleteRow: (uniqueId: string) => void;
  dirtyRows: AttendanceRow[];
  clearDirtyFlags: () => void;
  refetch: () => void;
}

// Hook that provides attendance data with local editing capability
export function useAttendanceData(
  date: string,
  userId: string | undefined
): AttendanceDataHook {
  const query = useAttendanceQuery(date, userId);
  const queryClient = useQueryClient();

  // Local state for edited data
  const [localData, setLocalData] = React.useState<AttendanceRow[]>([]);

  // Sync local data when server data loads
  React.useEffect(() => {
    if (query.data) {
      setLocalData(query.data);
    }
  }, [query.data]);

  // Update a single row by uniqueId
  const updateRow = React.useCallback(
    (uniqueId: string, updater: (row: AttendanceRow) => AttendanceRow) => {
      if (!uniqueId) {
        console.warn('updateRow called with empty uniqueId');
        return;
      }
      setLocalData((prev) =>
        prev.map((row) => (row.uniqueId === uniqueId ? updater(row) : row))
      );
    },
    []
  );

  // Insert a new row
  const insertRow = React.useCallback((newRow: AttendanceRow) => {
    setLocalData((prev) => [...prev, newRow]);
  }, []);

  // Delete a row
  const deleteRow = React.useCallback((uniqueId: string) => {
    setLocalData((prev) => prev.filter((row) => row.uniqueId !== uniqueId));
  }, []);

  // Get dirty rows (rows with isDirty flag)
  const dirtyRows = React.useMemo(
    () => localData.filter((row) => row.isDirty),
    [localData]
  );

  // Clear dirty flags after successful save
  const clearDirtyFlags = React.useCallback(() => {
    setLocalData((prev) =>
      prev.map((row) => ({
        ...row,
        isDirty: false,
        statusError: undefined,
        headError: undefined,
      }))
    );
  }, []);

  // Refetch from server
  const refetch = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getAttendanceQueryKey(date, userId || ''),
    });
  }, [queryClient, date, userId]);

  return {
    workers: localData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateRow,
    insertRow,
    deleteRow,
    dirtyRows,
    clearDirtyFlags,
    refetch,
  };
}
