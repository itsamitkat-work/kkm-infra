// Attendance configuration types and API integration
import { apiFetch } from '@/lib/apiClient';

// API Response types
export interface IncentiveRatePerHour {
  overtime: number;
  undertime: number;
  nightShift: number;
  weekend: number;
  holiday: number;
}

export interface GlobalConfig {
  idealInTime: string; // e.g., "09:00:00"
  idealOutTime: string; // e.g., "18:00:00"
  halfDaySplitTime: string; // e.g., "13:00:00"
  gracePeriodMinutes: number;
  workingHoursPerDay: number;
  incentiveRatePerHour: IncentiveRatePerHour;
}

export interface ProjectConfig {
  projectId: string;
  idealInTime: string;
  idealOutTime: string;
  incentiveRatePerHour: IncentiveRatePerHour;
}

export interface AttendanceConfigResponse {
  isSuccess: boolean;
  data: {
    global: GlobalConfig;
    projects: Record<string, Omit<ProjectConfig, 'projectId'>>;
  };
  message: string;
  statusCode: number;
}

export interface AttendanceTimeConfig {
  idealInTime: string;
  idealOutTime: string;
  gracePeriodMinutes: number;
  workingHoursPerDay: number;
  incentiveRatePerHour: IncentiveRatePerHour;
  halfDaySplitTime?: string;
}

export interface ProjectOverride extends AttendanceTimeConfig {
  projectId: string;
  projectName?: string;
}

export interface AttendanceConfig {
  global: AttendanceTimeConfig;
  projectOverrides: ProjectOverride[];
}

// API Functions
export async function fetchAttendanceConfig(): Promise<AttendanceConfig> {
  const response = await apiFetch<AttendanceConfigResponse>(
    'v2/attendance/config'
  );

  if (!response.isSuccess) {
    throw new Error(response.message || 'Failed to fetch attendance config');
  }

  // Transform API response to internal format
  return {
    global: {
      idealInTime: response.data.global.idealInTime.substring(0, 5), // "09:00:00" -> "09:00"
      idealOutTime: response.data.global.idealOutTime.substring(0, 5),
      gracePeriodMinutes: response.data.global.gracePeriodMinutes,
      workingHoursPerDay: response.data.global.workingHoursPerDay,
      incentiveRatePerHour: response.data.global.incentiveRatePerHour,
      halfDaySplitTime: response.data.global.halfDaySplitTime.substring(0, 5),
    },
    projectOverrides: Object.entries(response.data.projects).map(
      ([projectId, project]) => ({
        projectId: projectId,
        idealInTime: project.idealInTime.substring(0, 5),
        idealOutTime: project.idealOutTime.substring(0, 5),
        gracePeriodMinutes: response.data.global.gracePeriodMinutes, // Use global as fallback
        workingHoursPerDay: response.data.global.workingHoursPerDay, // Use global as fallback
        incentiveRatePerHour: project.incentiveRatePerHour,
      })
    ),
  };
}

export async function updateGlobalConfig(
  config: Partial<GlobalConfig>
): Promise<AttendanceConfigResponse> {
  // Transform time format from "09:00" to "09:00:00" if needed
  const transformedConfig = {
    ...config,
    idealInTime: config.idealInTime
      ? config.idealInTime.length === 5
        ? `${config.idealInTime}:00`
        : config.idealInTime
      : undefined,
    idealOutTime: config.idealOutTime
      ? config.idealOutTime.length === 5
        ? `${config.idealOutTime}:00`
        : config.idealOutTime
      : undefined,
    halfDaySplitTime: config.halfDaySplitTime
      ? config.halfDaySplitTime.length === 5
        ? `${config.halfDaySplitTime}:00`
        : config.halfDaySplitTime
      : undefined,
  };

  return await apiFetch<AttendanceConfigResponse>(
    'v2/attendance/config/global',
    {
      method: 'PUT',
      data: transformedConfig,
    }
  );
}

export async function updateProjectConfig(
  projectId: string,
  config: Omit<ProjectConfig, 'projectId'>
): Promise<AttendanceConfigResponse> {
  // Transform time format from "09:00" to "09:00:00" if needed
  const transformedConfig = {
    projectId,
    idealInTime:
      config.idealInTime.length === 5
        ? `${config.idealInTime}:00`
        : config.idealInTime,
    idealOutTime:
      config.idealOutTime.length === 5
        ? `${config.idealOutTime}:00`
        : config.idealOutTime,
    incentiveRatePerHour: config.incentiveRatePerHour,
  };

  return await apiFetch<AttendanceConfigResponse>(
    `v2/attendance/config/projects/${projectId}`,
    {
      method: 'POST',
      data: transformedConfig,
    }
  );
}

type SingleProjectConfig = {
  settings: {
    projectId: string;
    idealInTime: string;
    idealOutTime: string;
    incentiveRatePerHour: {
      overtime: number;
      undertime: number;
      nightShift: number;
      weekend: number;
      holiday: number;
    };
  };
  inherited: {
    halfDaySplitTime: string;
    gracePeriodMinutes: number;
    workingHoursPerDay: number;
  };
};

export async function fetchProjectConfig(
  projectId: string
): Promise<SingleProjectConfig | null> {
  try {
    const response = await apiFetch<{
      isSuccess: boolean;
      data: SingleProjectConfig;
      message: string;
    }>(`v2/attendance/config/projects/${projectId}`);

    if (!response.isSuccess) {
      return null;
    }

    return response.data;
  } catch {
    return null; // Return null if not found or other errors
  }
}

export function getConfigForProject(
  config: AttendanceConfig,
  projectId?: string
): AttendanceTimeConfig {
  if (projectId) {
    const override = config.projectOverrides.find(
      (p) => p.projectId === projectId
    );
    if (override) {
      return {
        idealInTime: override.idealInTime,
        idealOutTime: override.idealOutTime,
        gracePeriodMinutes: override.gracePeriodMinutes,
        workingHoursPerDay: override.workingHoursPerDay,
        incentiveRatePerHour: override.incentiveRatePerHour,
        halfDaySplitTime: override.halfDaySplitTime,
      };
    }
  }
  return config.global;
}

// Check if a clock-in time is late based on config
export function isLateClockIn(
  clockInTime: string,
  config: AttendanceTimeConfig
): boolean {
  const [idealH, idealM] = config.idealInTime.split(':').map(Number);

  // Strip AM/PM if present
  const cleanTime = clockInTime.replace(/\s*(AM|PM)\s*$/i, '').trim();
  const [clockH, clockM] = cleanTime.split(':').map(Number);

  const idealMinutes = idealH * 60 + idealM + config.gracePeriodMinutes;
  const clockMinutes = clockH * 60 + clockM;

  return clockMinutes > idealMinutes;
}

// Parse time string (HH:mm or ISO string) to minutes since midnight
function parseTimeToMinutes(time: string): number {
  // If it's an ISO string (contains 'T'), extract the time part
  let timeStr = time;
  if (time.includes('T')) {
    const timePart = time.split('T')[1]; // "09:30:00Z"
    timeStr = timePart.split('.')[0].substring(0, 5); // "09:30"
  }

  const cleanTime = timeStr.replace(/\s*(AM|PM)\s*$/i, '').trim();
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return hours * 60 + minutes;
}

// Calculate worked minutes handling cross-day scenarios
// Returns the difference in minutes between clockOut and clockIn
function calculateWorkedMinutes(
  clockIn: string,
  clockOut: string,
  baseDate?: string
): number | null {
  // Check if either time has a date component (ISO format)
  const inHasDate = clockIn.includes('T');
  const outHasDate = clockOut.includes('T');

  // If outTime has a date (cross-day scenario), use full datetime comparison
  if (outHasDate) {
    const outDate = new Date(clockOut);
    // For inTime, if it doesn't have a date, use base date if provided, otherwise use outTime's date
    let inDate: Date;
    if (inHasDate) {
      inDate = new Date(clockIn);
    } else {
      // Use base date if provided (attendance date), otherwise use outTime's date
      const datePart = baseDate
        ? baseDate.includes('T')
          ? baseDate.split('T')[0]
          : baseDate
        : clockOut.split('T')[0];
      // Parse inTime
      const [inHours, inMinutes] = clockIn
        .replace(/\s*(AM|PM)\s*$/i, '')
        .trim()
        .split(':')
        .map(Number);
      // Start with base date or outTime's date
      inDate = new Date(
        `${datePart}T${String(inHours).padStart(2, '0')}:${String(inMinutes).padStart(2, '0')}:00`
      );
      // If inTime is greater than outTime on the same day, inTime must be from previous day
      if (inDate > outDate) {
        inDate.setDate(inDate.getDate() - 1);
      }
    }

    const diffMs = outDate.getTime() - inDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? diffMinutes : null;
  }

  // Simple same-day calculation
  const inMinutes = parseTimeToMinutes(clockIn);
  const outMinutes = parseTimeToMinutes(clockOut);
  const workedMinutes = outMinutes - inMinutes;

  return workedMinutes > 0 ? workedMinutes : null;
}

// Calculate overtime/undertime based on clock in/out and work hours config
// Returns string like "+2h 15m" for overtime or "-1h 30m" for undertime
export function calculateOvertime(
  clockIn: string | null,
  clockOut: string | null,
  config: AttendanceTimeConfig,
  baseDate?: string
): string | null {
  if (!clockIn || !clockOut) return null;

  const workedMinutes = calculateWorkedMinutes(clockIn, clockOut, baseDate);
  if (workedMinutes === null) return null;

  // Expected work minutes
  const expectedMinutes = config.workingHoursPerDay * 60;

  // Difference (positive = overtime, negative = undertime)
  const diffMinutes = workedMinutes - expectedMinutes;

  if (diffMinutes === 0) return null;

  const absDiff = Math.abs(diffMinutes);
  const hours = Math.floor(absDiff / 60);
  const minutes = absDiff % 60;

  const sign = diffMinutes > 0 ? '+' : '-';
  if (hours > 0 && minutes > 0) {
    return `${sign}${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${sign}${hours}h`;
  } else {
    return `${sign}${minutes}m`;
  }
}

// Calculate duration from clock in/out
export function calculateDuration(
  clockIn: string | null,
  clockOut: string | null,
  baseDate?: string
): string | null {
  if (!clockIn || !clockOut) return null;

  const workedMinutes = calculateWorkedMinutes(clockIn, clockOut, baseDate);
  if (workedMinutes === null) return null;

  const hours = Math.floor(workedMinutes / 60);
  const minutes = workedMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

// Calculate worked hours as decimal (e.g., 8.5 for 8h 30m)
export function calculateWorkedHours(
  clockIn: string | null,
  clockOut: string | null,
  baseDate?: string
): number | null {
  if (!clockIn || !clockOut) return null;

  const workedMinutes = calculateWorkedMinutes(clockIn, clockOut, baseDate);
  if (workedMinutes === null) return null;

  return workedMinutes / 60; // Convert to hours
}

// Calculate overtime/undertime hours as decimal (positive = overtime, negative = undertime)
export function calculateOvertimeHours(
  clockIn: string | null,
  clockOut: string | null,
  config: AttendanceTimeConfig,
  baseDate?: string
): number | null {
  if (!clockIn || !clockOut) return null;

  const workedMinutes = calculateWorkedMinutes(clockIn, clockOut, baseDate);
  if (workedMinutes === null) return null;

  // Expected work minutes
  const expectedMinutes = config.workingHoursPerDay * 60;

  // Difference in hours (positive = overtime, negative = undertime)
  const diffMinutes = workedMinutes - expectedMinutes;
  return diffMinutes / 60;
}

// Calculate incentive based on overtime/undertime and rate per hour
// Positive for overtime, negative for undertime
// Note: This uses the 'overtime' rate from incentiveRatePerHour for simplicity
export function calculateIncentive(
  clockIn: string | null,
  clockOut: string | null,
  config: AttendanceTimeConfig
): number | null {
  const overtimeHours = calculateOvertimeHours(clockIn, clockOut, config);
  if (overtimeHours === null) return null;

  // Use overtime rate for positive hours, undertime rate for negative hours
  const rate =
    overtimeHours > 0
      ? config.incentiveRatePerHour.overtime
      : config.incentiveRatePerHour.undertime;
  return Math.round(overtimeHours * rate);
}
