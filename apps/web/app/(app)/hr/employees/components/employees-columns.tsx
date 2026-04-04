'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  Employee,
  DEPARTMENT_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  DESIGNATION_OPTIONS,
} from '../types/employee';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { formatDateSlash } from '@/lib/utils';
import { formatIndianNumber } from '@/lib/numberToText';
import React from 'react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';

function getEmploymentTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'full_time':
      return 'default';
    case 'part_time':
      return 'secondary';
    case 'contract':
      return 'outline';
    case 'intern':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getLabelFromValue(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((opt) => opt.value === value)?.label || value;
}

export function getColumns(
  onEmployeeAction: (employee: Employee, mode: 'edit' | 'read') => void,
  onDeleteEmployee: (employeeId: string) => void,
  onNavigateToDetail: (employee: Employee) => void
): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: 'employeeCode',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Emp Code' className='pl-2' />
      ),
      cell: ({ row }) => (
        <span className='pl-2 text-sm font-medium text-muted-foreground'>
          {row.original.employeeCode}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Name' />
      ),
      cell: ({ row }) => (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              className='text-foreground w-full text-left hover:text-primary justify-start h-auto py-1'
              onClick={() => onNavigateToDetail(row.original)}
            >
              <span className='block overflow-hidden text-ellipsis whitespace-nowrap'>
                {row.original.name}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{row.original.name}</p>
          </TooltipContent>
        </Tooltip>
      ),
      enableHiding: false,
      size: 200,
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Phone' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.phone}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'department',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Department' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.department || '—'}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'employeeType',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Employee Type' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.employeeType || '—'}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'designation',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Designation' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.designation || '—'}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'subDesignation',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Sub Designation' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.subDesignation || '—'}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'basicSalary',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Basic Salary' />
      ),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          ₹{formatIndianNumber(row.original.basicSalary)}
        </span>
      ),
      size: 130,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        // Determine status based on joiningDate - if exists, employee is active
        const isActive = !!row.original.joiningDate;
        return <StatusBadge status={isActive ? 'Active' : 'Inactive'} />;
      },
      size: 120,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className='data-[state=open]:bg-muted text-muted-foreground flex size-8'
              size='icon'
            >
              <IconDotsVertical />
              <span className='sr-only'>Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-40'>
            <DropdownMenuItem
              onClick={() => onEmployeeAction(row.original, 'edit')}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEmployeeAction(row.original, 'read')}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              onClick={() => onDeleteEmployee(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ];
}
