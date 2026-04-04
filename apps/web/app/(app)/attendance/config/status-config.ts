import { AttendanceStatus } from '../types';

/**
 * RGB color values for PDF/Excel exports
 * Maps Tailwind color classes to RGB arrays
 */
const COLOR_MAP = {
  'bg-red-500': [239, 68, 68] as [number, number, number], // red-500
  'bg-amber-500': [245, 158, 11] as [number, number, number], // amber-500
  'bg-emerald-500': [16, 185, 129] as [number, number, number], // emerald-500
  'bg-purple-500': [168, 85, 247] as [number, number, number], // purple-500
} as const;

/**
 * Status configuration for attendance statuses
 * Used across UI components and export utilities
 */
export interface StatusConfig {
  value: string;
  label: string;
  shortLabel?: string;
  dotClass: string;
  textClass: string;
  // RGB colors for PDF/Excel exports
  fillColor: [number, number, number];
  textColor: [number, number, number];
}

export const STATUS_CONFIG: Record<string , StatusConfig> = {
  A: {
    value: 'A',
    label: 'Absent (A)',
    shortLabel: 'A',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600',
    fillColor: COLOR_MAP['bg-red-500'],
    textColor: [220, 38, 38], // red-600
  },
  first_half: {
    value: '4',
    label: 'First Half (U4)',
    shortLabel: '1st Half',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  second_half: {
    value: '4',
    label: 'Second Half (U4)',
    shortLabel: '2nd Half',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  // Undertime statuses (less than one full shift)
  U1: {
    value: '1',
    label: 'U1 (1 hour)',
    shortLabel: 'U1',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U2: {
    value: '2',
    label: 'U2 (2 hours)',
    shortLabel: 'U2',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U3: {
    value: '3',
    label: 'U3 (3 hours)',
    shortLabel: 'U3',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U4: {
    value: '4',
    label: 'U4 (4 hours)',
    shortLabel: 'U4',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U5: {
    value: '5',
    label: 'U5 (5 hours)',
    shortLabel: 'U5',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U6: {
    value: '6',
    label: 'U6 (6 hours)',
    shortLabel: 'U6',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  U7: {
    value: '7',
    label: 'U7 (7 hours)',
    shortLabel: 'U7',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
    fillColor: COLOR_MAP['bg-amber-500'],
    textColor: [217, 119, 6], // amber-600
  },
  // Overtime statuses (P = Present/1 shift)
  P: {
    value: 'P',
    label: 'Present (P)',
    shortLabel: 'P',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600',
    fillColor: COLOR_MAP['bg-emerald-500'],
    textColor: [5, 150, 105], // emerald-600
  },
  P1: {
    value: 'P1',
    label: 'P1 (1 shift + 1h)',
    shortLabel: 'P1',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P2: {
    value: 'P2',
    label: 'P2 (1 shift + 2h)',
    shortLabel: 'P2',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P3: {
    value: 'P3',
    label: 'P3 (1 shift + 3h)',
    shortLabel: 'P3',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P4: {
    value: 'P4',
    label: 'P4 (1 shift + 4h)',
    shortLabel: 'P4',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P5: {
    value: 'P5',
    label: 'P5 (1 shift + 5h)',
    shortLabel: 'P5',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P6: {
    value: 'P6',
    label: 'P6 (1 shift + 6h)',
    shortLabel: 'P6',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P7: {
    value: 'P7',
    label: 'P7 (1 shift + 7h)',
    shortLabel: 'P7',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  P8: {
    value: 'P8',
    label: 'P8 (1 shift + 8h)',
    shortLabel: 'P8',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP: {
    value: 'PP',
    label: 'PP (2 shifts)',
    shortLabel: 'PP',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP1: {
    value: 'PP1',
    label: 'PP1 (2 shifts + 1h)',
    shortLabel: 'PP1',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP2: {
    value: 'PP2',
    label: 'PP2 (2 shifts + 2h)',
    shortLabel: 'PP2',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP3: {
    value: 'PP3',
    label: 'PP3 (2 shifts + 3h)',
    shortLabel: 'PP3',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP4: {
    value: 'PP4',
    label: 'PP4 (2 shifts + 4h)',
    shortLabel: 'PP4',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP5: {
    value: 'PP5',
    label: 'PP5 (2 shifts + 5h)',
    shortLabel: 'PP5',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP6: {
    value: 'PP6',
    label: 'PP6 (2 shifts + 6h)',
    shortLabel: 'PP6',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP7: {
    value: 'PP7',
    label: 'PP7 (2 shifts + 7h)',
    shortLabel: 'PP7',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PP8: {
    value: 'PP8',
    label: 'PP8 (2 shifts + 8h)',
    shortLabel: 'PP8',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
  PPP: {
    value: 'PPP',
    label: 'PPP (3 shifts)',
    shortLabel: 'PPP',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600',
    fillColor: COLOR_MAP['bg-purple-500'],
    textColor: [147, 51, 234], // purple-600
  },
};

// Status groups for logical organization
export const PRESENT_STATUS_OPTIONS: AttendanceStatus[] = ['P'];
export const NOT_PRESENT_STATUS_OPTIONS: AttendanceStatus[] = ['A'];
