import { AttendanceRow } from '../types';

export interface AttendanceSummary {
  total: number; // Total attendance records (same user can have multiple records for different projects)
  present: number; // All statuses except 'A' (includes P, overtime, undertime - all are present)
  absent: number; // Status = 'A'
  overtime: number; // Status = P1-P7, PP, PP1-PP7, PPP (beyond one full shift)
  undertime: number; // Status = U1-U7 (less than one full shift)
}

/**
 * Calculate attendance summary based on status.
 * Note: The same user can have attendance records on more than one project,
 * so total count includes all records (not unique users).
 */
export function calculateAttendanceSummary(
  workers: AttendanceRow[]
): AttendanceSummary {
  // Total: Count of all attendance records
  // Same user can have multiple records for different projects
  const total = workers.length;

  // Present: All statuses except 'A' (includes P, overtime, undertime - all are present)
  const present = workers.filter(
    (row) => row.status !== null && row.status !== 'A'
  ).length;

  // Absent: Status = 'A'
  const absent = workers.filter((row) => row.status === 'A').length;

  // Overtime: Status = P1-P7, PP, PP1-PP7, PPP (beyond one full shift)
  // Pattern: starts with 'P' but not exactly 'P', or starts with 'PP'
  const overtime = workers.filter((row) => {
    if (!row.status) return false;
    return (
      (row.status.startsWith('P') && row.status !== 'P') ||
      row.status.startsWith('PP')
    );
  }).length;

  // Undertime: Status = U1-U7 (less than one full shift)
  // Pattern: starts with 'U' followed by digits
  const undertime = workers.filter((row) => {
    if (!row.status) return false;
    return /^U\d+$/.test(row.status);
  }).length;

  return {
    total,
    present,
    absent,
    overtime,
    undertime,
  };
}
