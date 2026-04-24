'use client';

import * as React from 'react';
import { FilterFieldsConfig } from '@/components/ui/filters';
import {
  Calendar,
  CheckCircle2,
  FileText,
  HardHat,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { AttendanceStatus } from '../types';
import { STATUS_CONFIG } from '../config/status-config';

// Generate attendance status options from STATUS_CONFIG to ensure consistency
// Exclude first_half and second_half as they don't exist in the backend
export const ATTENDANCE_STATUS_OPTIONS: {
  value: string;
  label: string;
}[] = Object.values(STATUS_CONFIG)
  .filter(
    (config) => config.value !== 'first_half' && config.value !== 'second_half'
  )
  .map((config) => ({
    value: config.value,
    label: config.label,
  }));

export const VERIFICATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'checked', label: 'Checked' },
  { value: 'verified', label: 'Verified' },
];

export function getAttendanceReportFilterFields(
  reportTypes: Array<{ value: string; label: string }>,
  projectHeads: Array<{ value: string; label: string }> = [],
  engineers: Array<{ value: string; label: string }> = [],
  supervisors: Array<{ value: string; label: string }> = [],
  projects: Array<{ value: string; label: string }> = [],
  workers: Array<{ value: string; label: string }> = []
): FilterFieldsConfig {
  return [
    // Required filters section
    {
      group: 'Required',
      fields: [
        {
          key: 'reportType',
          label: 'Report Type',
          type: 'select',
          icon: <FileText className='h-4 w-4' />,
          options: reportTypes,
          required: true, // Primary filter - cannot be removed
          className: 'min-w-0', // Allow container to shrink and wrap
          popoverContentClassName: 'w-[300px]', // Wider dropdown to show more text
          wrapOptionText: true, // Wrap text in dropdown options instead of truncating
        },
      ],
    },
    // Optional filters section
    {
      group: 'Optional',
      fields: [
        {
          key: 'dateRange',
          label: 'Date Range',
          type: 'daterange',
          icon: <Calendar className='h-4 w-4' />,
          showOperatorDropdown: true,
        },
        {
          key: 'projectHead',
          label: 'Project Head',
          type: 'select',
          icon: <User className='h-4 w-4' />,
          options: projectHeads,
          searchable: true,
        },
        {
          key: 'engineer',
          label: 'Engineer',
          type: 'select',
          icon: <Wrench className='h-4 w-4' />,
          options: engineers,
          searchable: true,
        },
        {
          key: 'supervisor',
          label: 'Supervisor',
          type: 'select',
          icon: <Users className='h-4 w-4' />,
          options: supervisors,
          searchable: true,
        },
        {
          key: 'project',
          label: 'Project',
          type: 'select',
          icon: <HardHat className='h-4 w-4' />,
          options: projects,
          searchable: true,
        },
        {
          key: 'worker',
          label: 'Worker',
          type: 'select',
          icon: <User className='h-4 w-4' />,
          options: workers,
          searchable: true,
        },
        {
          key: 'attendanceStatus',
          label: 'Attendance Status',
          type: 'select',
          icon: <CheckCircle2 className='h-4 w-4' />,
          options: ATTENDANCE_STATUS_OPTIONS,
        },
        {
          key: 'verificationStatus',
          label: 'Verification Status',
          type: 'select',
          icon: <CheckCircle2 className='h-4 w-4' />,
          options: VERIFICATION_STATUS_OPTIONS,
        },
      ],
    },
  ];
}
