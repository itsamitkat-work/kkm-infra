// Attendance Report API Response Types
// Different report types return different structures
// Note: All types need an 'id' field for DataTable compatibility
export interface AttendanceReportRecordType1 {
  id?: string; // Generated unique ID for DataTable
  employeeName: string; // Format: "code-name-phone"
  absent: number;
  leave: number;
  persent: number; // Note: API has typo "persent" instead of "present"
  workingHours: number;
  workingDays: number;
  incentive: number;
  salary: number;
}

export interface AttendanceReportRecordType2 {
  id?: string; // Generated unique ID for DataTable
  months: string;
  projectName: string;
  employee: string;
  totalWorkedHours: number;
  days: string;
}

export interface AttendanceReportRecordType5 {
  id?: string; // Generated unique ID for DataTable
  months: string;
  projectName: string;
  designation: string;
  hours: number; // Can be negative
  days: number; // Can be negative
}

export interface AttendanceReportRecordType3 {
  id?: string; // Generated unique ID for DataTable
  years: string;
  projectName: string;
  designation: string | null;
  hours: number;
  days: number;
}

export interface AttendanceReportRecordType4 {
  id?: string; // Generated unique ID for DataTable
  date: string; // Format: "17/Dec/2025"
  project: string;
  employee: string; // Format: "250023-Nitish Kumar"
  inTime: string; // Format: "09:00:00"
  outTime: string; // Format: "21:00:00"
  totalHours: string; // Format: "12:00:00"
  att: string; // Attendance status like "P4"
  incentive: number;
  remarks: string;
}

// Union type for all possible report record structures
export type AttendanceReportRecord =
  | AttendanceReportRecordType1
  | AttendanceReportRecordType2
  | AttendanceReportRecordType3
  | AttendanceReportRecordType4
  | AttendanceReportRecordType5;

export interface AttendanceReportResponse {
  isSuccess: boolean;
  data: AttendanceReportRecord[];
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// Report List Types
export interface ReportTypeItem {
  name: string;
  code: number;
  id: string;
}

export interface ReportTypeResponse {
  isSuccess: boolean;
  data: ReportTypeItem[];
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// API Parameters
export type ExportType = 'Pdf' | 'Excel';

export interface AttendanceReportParams {
  StartDate?: string;
  EndDate?: string;
  ReportNo?: number;
  ExportType?: ExportType;
  SuperviserId?: string;
  EmployeeId?: string;
  ProjectId?: string;
  ProjectHeadId?: string;
  ProjectEngineerId?: string;
  IsChecked?: boolean;
  IsVerified?: boolean;
  page?: number;
  pageSize?: number;
}
