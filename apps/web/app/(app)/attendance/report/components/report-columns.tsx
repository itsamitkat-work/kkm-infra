'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AttendanceReportRecord,
  AttendanceReportRecordType1,
  AttendanceReportRecordType2,
  AttendanceReportRecordType3,
  AttendanceReportRecordType4,
  AttendanceReportRecordType5,
} from '../types';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { STATUS_CONFIG } from '../../config/status-config';
import { AttendanceStatus } from '../../types';
import { cn } from '@/lib/utils';

// Type guards to determine which structure we have
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

// Parse employee name from format "code-name-phone"
function parseEmployeeName(employeeName: string) {
  const parts = employeeName.split('-');
  if (parts.length >= 3) {
    return {
      code: parts[0],
      name: parts.slice(1, -1).join(' '), // Handle names with multiple parts
      phone: parts[parts.length - 1],
    };
  }
  return {
    code: '',
    name: employeeName,
    phone: '',
  };
}

// Columns for Type 1 structure (employeeName, absent, leave, etc.)
const getType1Columns = (): ColumnDef<AttendanceReportRecord>[] => [
  {
    accessorKey: 'employeeName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Employee' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      const employeeName = row.original.employeeName;
      if (!employeeName) {
        return <span className='text-muted-foreground'>-</span>;
      }
      const parsed = parseEmployeeName(employeeName);
      return (
        <div className='flex flex-col'>
          <span className='font-medium'>{parsed.name}</span>
          <span className='text-xs text-muted-foreground'>
            {parsed.code} {parsed.phone && `- ${parsed.phone}`}
          </span>
        </div>
      );
    },
    size: 200,
  },
  {
    accessorKey: 'absent',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Absent' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      return <span>{row.original.absent}</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'leave',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Leave' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      return <span>{row.original.leave}</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'persent',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Present' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      return <span>{row.original.persent}</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'workingHours',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Working Hours' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      return <span>{row.original.workingHours}</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'workingDays',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Working Days' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      return <span>{row.original.workingDays}</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'incentive',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Incentive' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      const incentive = row.original.incentive;
      return (
        <span>
          {incentive !== null && incentive !== undefined
            ? `₹${incentive.toLocaleString()}`
            : '₹0'}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'salary',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Salary' />
    ),
    cell: ({ row }) => {
      if (!isType1(row.original)) {
        return <span className='text-muted-foreground'>-</span>;
      }
      const salary = row.original.salary;
      return (
        <span>
          {salary !== null && salary !== undefined
            ? `₹${salary.toLocaleString()}`
            : '₹0'}
        </span>
      );
    },
    size: 150,
  },
];

// Columns for Type 2 structure (months, projectName, employee, etc.)
const getType2Columns = (): ColumnDef<AttendanceReportRecord>[] => [
  {
    accessorKey: 'months',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Month' />
    ),
    cell: ({ row }) => {
      if (isType2(row.original)) {
        return <span>{row.original.months}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'projectName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Project' />
    ),
    cell: ({ row }) => {
      if (isType2(row.original)) {
        return <span>{row.original.projectName}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 250,
  },
  {
    accessorKey: 'employee',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Employee' />
    ),
    cell: ({ row }) => {
      if (isType2(row.original)) {
        return <span>{row.original.employee}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 200,
  },
  {
    accessorKey: 'totalWorkedHours',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Total Worked Hours' />
    ),
    cell: ({ row }) => {
      if (isType2(row.original)) {
        return <span>{row.original.totalWorkedHours}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 150,
  },
  {
    accessorKey: 'days',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Days' />
    ),
    cell: ({ row }) => {
      if (isType2(row.original)) {
        return <span>{row.original.days}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
];

// Columns for Type 3 structure (years, projectName, designation, hours, days)
const getType3Columns = (): ColumnDef<AttendanceReportRecord>[] => [
  {
    accessorKey: 'years',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Year' />
    ),
    cell: ({ row }) => {
      if (isType3(row.original)) {
        return <span>{row.original.years}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'projectName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Project' />
    ),
    cell: ({ row }) => {
      if (isType3(row.original)) {
        return <span>{row.original.projectName}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 250,
  },
  {
    accessorKey: 'designation',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Designation' />
    ),
    cell: ({ row }) => {
      if (isType3(row.original)) {
        return (
          <span>
            {row.original.designation || (
              <span className='text-muted-foreground'>-</span>
            )}
          </span>
        );
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 150,
  },
  {
    accessorKey: 'hours',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Hours' />
    ),
    cell: ({ row }) => {
      if (isType3(row.original)) {
        return <span>{row.original.hours}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'days',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Days' />
    ),
    cell: ({ row }) => {
      if (isType3(row.original)) {
        return <span>{row.original.days}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
];

// Columns for Type 4 structure (date, project, employee, inTime, outTime, etc.)
const getType4Columns = (): ColumnDef<AttendanceReportRecord>[] => [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Date' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.date}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'project',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Project' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.project}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 250,
  },
  {
    accessorKey: 'employee',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Employee' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.employee}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 200,
  },
  {
    accessorKey: 'inTime',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='In Time' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.inTime}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'outTime',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Out Time' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.outTime}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'totalHours',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Total Hours' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return <span>{row.original.totalHours}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'att',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Attendance' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        const status = row.original.att as AttendanceStatus;
        if (!status) {
          return <span className='text-muted-foreground'>-</span>;
        }
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.A;
        const displayLabel = config.shortLabel || config.label;
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-muted/30 px-2 py-0.5 border border-muted'
            )}
          >
            <span className={cn('size-1.5 rounded-full', config.dotClass)} />
            <span className={cn('text-[10px] font-medium', config.textClass)}>
              {displayLabel}
            </span>
          </div>
        );
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
  {
    accessorKey: 'incentive',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Incentive' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        const incentive = row.original.incentive;
        return (
          <span>
            {incentive !== null && incentive !== undefined
              ? `₹${incentive.toLocaleString()}`
              : '₹0'}
          </span>
        );
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'remarks',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Remarks' />
    ),
    cell: ({ row }) => {
      if (isType4(row.original)) {
        return (
          <span className='text-sm'>
            {row.original.remarks || (
              <span className='text-muted-foreground'>-</span>
            )}
          </span>
        );
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 200,
  },
];

// Columns for Type 5 structure (months, projectName, designation, hours, days)
const getType5Columns = (): ColumnDef<AttendanceReportRecord>[] => [
  {
    accessorKey: 'months',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Month' />
    ),
    cell: ({ row }) => {
      if (isType5(row.original)) {
        return <span>{row.original.months}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'projectName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Project' />
    ),
    cell: ({ row }) => {
      if (isType5(row.original)) {
        return <span>{row.original.projectName}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 250,
  },
  {
    accessorKey: 'designation',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Designation' />
    ),
    cell: ({ row }) => {
      if (isType5(row.original)) {
        return <span>{row.original.designation}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 150,
  },
  {
    accessorKey: 'hours',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Hours' />
    ),
    cell: ({ row }) => {
      if (isType5(row.original)) {
        return <span>{row.original.hours}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: 'days',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Days' />
    ),
    cell: ({ row }) => {
      if (isType5(row.original)) {
        return <span>{row.original.days}</span>;
      }
      return <span className='text-muted-foreground'>-</span>;
    },
    size: 100,
  },
];

// Determine which columns to use based on data structure
export function getReportColumns(
  data: AttendanceReportRecord[]
): ColumnDef<AttendanceReportRecord>[] {
  if (data.length === 0) {
    // Default to Type 1 if no data
    return getType1Columns();
  }
  // Check the first record to determine structure
  // Order matters - check more specific types first
  const firstRecord = data[0];
  if (isType5(firstRecord)) {
    return getType5Columns();
  }
  if (isType4(firstRecord)) {
    return getType4Columns();
  }
  if (isType3(firstRecord)) {
    return getType3Columns();
  }
  if (isType2(firstRecord)) {
    return getType2Columns();
  }
  return getType1Columns();
}
