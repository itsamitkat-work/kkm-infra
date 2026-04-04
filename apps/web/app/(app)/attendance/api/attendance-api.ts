import { apiFetch } from '@/lib/apiClient';
import { AttendanceRow, AttendanceStatus } from '../types';

export const ATTENDANCE_TABLE_ID = 'attendance';

export interface AttendanceParams {
  date: string;
  page?: number;
  userId?: string;
}

// API payload interface matching the backend format
interface AttendanceUpdatePayload {
  id?: string;
  dates: string; // ISO datetime string
  superviserId: string | null;
  projectId: string;
  empId: string;
  empNo: number | null;
  inTime: string | null; // ISO datetime string or null
  outTime: string | null; // ISO datetime string or null
  status: string | null;
  attendance: string | null;
  projectHeadId?: string | null;
  isVerified: boolean;
  projectEngineerId?: string | null;
  isChecked: boolean;
  rate?: number | null;
  incentive: number | null;
  head: string | null;
  remarks: string | null;
  updatedBy?: string | null;
  isLocked?: boolean;
}

/**
 * Calculate attendance value based on working hours.
 *
 * Logic:
 * - A = Absent (no inTime or outTime, or status indicates absent)
 * - P = Present (worked default hours)
 * - P1-P7 = Present + 1-7 extra hours
 * - PP = Double Present (2x working hours)
 * - PP1-PP7 = Double Present + 1-7 extra hours
 * - PPP = Triple Present (3x working hours)
 */
function calculateAttendanceValue(
  inTime: string | null,
  outTime: string | null,
  status: AttendanceStatus | null,
  workingHoursPerDay: number
): string {
  // If status indicates absent or no times provided
  if (status === 'A' || !inTime || !outTime) {
    return 'A';
  }

  // Parse times to calculate working hours
  const inDate = new Date(inTime);
  const outDate = new Date(outTime);

  // If dates are invalid, mark as absent
  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return 'A';
  }

  // Calculate hours worked
  const hoursWorked = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);

  // If worked less than 1 hour, mark undertime 1
  if (hoursWorked < 1) {
    return '1';
  }

  // Calculate full shifts and extra hours beyond full shifts
  const fullShifts = Math.floor(hoursWorked / workingHoursPerDay);
  const extraHours = Math.floor(hoursWorked % workingHoursPerDay);

  // Less than one full shift - return hours worked (1, 2, 3, etc.)
  if (fullShifts === 0) {
    const hours = Math.floor(hoursWorked);
    return String(hours);
  }

  // One full shift (P) + optional extra hours
  if (fullShifts === 1) {
    if (extraHours === 0) return 'P';
    return `P${extraHours}`;
  }

  // Two full shifts (PP) + optional extra hours
  if (fullShifts === 2) {
    if (extraHours === 0) return 'PP';
    return `PP${extraHours}`;
  }

  // Three or more full shifts
  return 'PPP';
}

// Helper function to convert time string to ISO datetime without UTC conversion
function convertTimeToISO(date: string, time: string | null): string | null {
  if (!time) return null;
  // If time is already in ISO format, return as is
  if (time.includes('T')) return time;

  // Normalize date string (take only YYYY-MM-DD part)
  const datePart = date.includes('T') ? date.split('T')[0] : date;

  // If time is in HH:MM format, combine with date directly (no UTC conversion)
  const timeParts = time.split(':');
  const hours = timeParts[0]?.padStart(2, '0') || '00';
  const minutes = timeParts[1]?.padStart(2, '0') || '00';

  // Return in format: YYYY-MM-DDTHH:MM:00 (preserving local time)
  return `${datePart}T${hours}:${minutes}:00`;
}

// Helper function to convert AttendanceRow to API payload format
function mapAttendanceRowToPayload(
  original: AttendanceRow,
  updates: Partial<AttendanceRow>,
  userId: string,
  workingHoursPerDay: number
): AttendanceUpdatePayload {
  const merged = { ...original, ...updates };

  const inTimeISO = convertTimeToISO(merged.dates, merged.inTime);
  const outTimeISO = convertTimeToISO(merged.dates, merged.outTime);

  const payload: AttendanceUpdatePayload = {
    id: merged.id,
    dates: merged.dates.split('T')[0],
    inTime: inTimeISO,
    outTime: outTimeISO,
    superviserId: userId,
    projectId: merged.projectId,
    empId: merged.empId,
    empNo: merged.empNo,
    status: merged.status || null,
    attendance: calculateAttendanceValue(
      inTimeISO,
      outTimeISO,
      merged.status,
      workingHoursPerDay
    ),
    // projectHeadId: null,
    isVerified: merged.isVerified,
    // projectEngineerId: null,
    isChecked: merged.isChecked,
    // rate: null,
    incentive: merged.incentive,
    head: merged.head,
    remarks: merged.remarks || null,
    // updatedBy: null,
    // isLocked: merged.isLocked ?? false, // Use existing isLocked value, don't calculate
  };

  // If id is missing or undefined, this is a new item to be created
  if (!merged.id) {
    delete payload['id'];
  }

  return payload;
}

export async function updateAttendanceRecord(
  id: string,
  updates: Partial<AttendanceRow>,
  userId: string,
  existingRow: AttendanceRow,
  workingHoursPerDay: number
): Promise<boolean> {
  const payload = mapAttendanceRowToPayload(
    existingRow,
    { ...updates, id },
    userId,
    workingHoursPerDay
  );
  const response = await apiFetch<{
    isSuccess: boolean;
    message: string;
  }>(`v2/attendance/bulk?userId=${userId}`, {
    method: 'POST',
    data: [payload],
  });

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to update attendance record');
  }
  return response.isSuccess;
}

export async function bulkCreateAttendance(
  records: Array<AttendanceRow>,
  userId: string,
  workingHoursPerDay: number
): Promise<{ createdCount: number; failedIds: string[] }> {
  const payloads: AttendanceUpdatePayload[] = records.map((record) =>
    mapAttendanceRowToPayload(record, {}, userId, workingHoursPerDay)
  );
  const response = await apiFetch<{
    isSuccess: boolean;
    message: string;
    totalCount?: number;
  }>(`v2/attendance/bulk?userId=${userId}`, {
    method: 'POST',
    data: payloads,
  });

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to perform bulk create');
  }

  return {
    createdCount: response.totalCount || payloads.length,
    failedIds: [],
  };
}

export async function bulkUpdateAttendance(
  records: Array<{ updates: Partial<AttendanceRow>; original: AttendanceRow }>,
  userId: string,
  workingHoursPerDay: number
): Promise<{ updatedCount: number; failedIds: string[] }> {
  const payloads: AttendanceUpdatePayload[] = records.map(
    ({ updates, original }) => {
      return mapAttendanceRowToPayload(
        original,
        updates,
        userId,
        workingHoursPerDay
      );
    }
  );

  const response = await apiFetch<{
    isSuccess: boolean;
    message: string;
    totalCount?: number;
  }>(`v2/attendance/bulk?userId=${userId}`, {
    method: 'POST',
    data: payloads,
  });

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to perform bulk update');
  }

  return {
    updatedCount: response.totalCount || payloads.length,
    failedIds: [],
  };
}

/**
 * Lock attendance records by IDs
 */
export async function lockAttendance(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;

  const response = await apiFetch<{
    isSuccess: boolean;
    message: string;
  }>('v2/attendance/lock', {
    method: 'POST',
    data: ids,
  });

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to lock attendance records');
  }

  return response.isSuccess;
}

/**
 * Unlock attendance records by IDs
 */
export async function unlockAttendance(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;

  const response = await apiFetch<{
    isSuccess: boolean;
    message: string;
  }>('v2/attendance/unlock', {
    method: 'POST',
    data: ids,
  });

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to unlock attendance records');
  }

  return response.isSuccess;
}
