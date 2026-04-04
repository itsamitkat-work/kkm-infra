export type AttendanceStatus =
  | 'A'
  | 'first_half'
  | 'second_half'
  // Undertime statuses (hours worked less than one full shift)
  | 'U1'
  | 'U2'
  | 'U3'
  | 'U4'
  | 'U5'
  | 'U6'
  | 'U7'
  // Overtime statuses
  | 'P'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'P8'
  | 'PP'
  | 'PP1'
  | 'PP2'
  | 'PP3'
  | 'PP4'
  | 'PP5'
  | 'PP6'
  | 'PP7'
  | 'PP8'
  | 'PPP';

export interface AttendanceRow {
  uniqueId: string; // Unique ID for the row
  id?: string; // Internal database ID
  empId: string; // Employee's unique identifier
  empName: string; // Employee's full name
  empCode: string; // Employee's code (e.g., "EMP001")
  empNo: number | null;
  employeeAvatar?: string; // Optional avatar URL
  projectId: string; // Default project ID for the employee
  projectName: string | null; // Default project name
  inTime: string | null; // ISO string or time string per requirement
  outTime: string | null; // ISO string or time string per requirement
  status: AttendanceStatus | null; // Attendance status
  head: string | null; // Head name
  projectHeadId: string | null | undefined; // Head ID
  remarks: string | null | undefined; // Additional remarks
  incentive: number | null; // Incentive amount
  isChecked: boolean; // Whether record has been checked
  isVerified: boolean; // Whether record has been verified
  isLocked: boolean; // Whether attendance for this date is locked
  dates: string; // ISO date string (YYYY-MM-DD)
  isDirty?: boolean; // Whether row has unsaved changes
  statusError?: string; // Validation error for status field
  headError?: string; // Validation error for head field
}

export type AttendanceRowUpdatePayload = {
  id: string;
  status?: AttendanceStatus | null;
  clockIn?: string | null;
  clockOut?: string | null;
  headName?: string | null;
  headId?: string;
  remarks?: string;
  incentive?: number | null;
  checked?: boolean;
  verified?: boolean;
  locked?: boolean;
  projectId?: string;
  projectName?: string | null;
};
