import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { ATTENDANCE_TABLE_ID } from '../api/attendance-api';

export interface AttendanceSummary {
  total: number;
  presents: number;
  absents: number;
  leaves: number;
  holidays: number;
  onTime: number;
  halfDays: number;
}

async function fetchAttendanceSummary(params: {
  date: string;
  userId: string | undefined;
  projectId?: string | undefined;
}): Promise<AttendanceSummary> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== 'all') {
      queryParams.append(key, value.toString());
    }
  });

  const response = await apiFetch<{
    data: AttendanceSummary;
    isSuccess: boolean;
  }>(`v2/attendance/summary?${queryParams.toString()}`);

  if (!response.isSuccess) {
    throw new Error('Failed to fetch attendance summary');
  }

  return response.data;
}

export function useAttendanceSummary({
  date,
  userId,
  projectId,
}: {
  date: string;
  userId: string | undefined;
  projectId?: string;
}) {
  return useQuery({
    queryKey: [ATTENDANCE_TABLE_ID, 'summary', { date, userId, projectId }],
    queryFn: () => fetchAttendanceSummary({ date, userId, projectId }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId && !!date,
  });
}
