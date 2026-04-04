'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Project } from '@/types/projects';
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
import {
  formatDateSlash,
  calculateDuration,
  calculateDaysRemaining,
} from '@/lib/utils';
import { numberToText, formatIndianNumber } from '@/lib/numberToText';
import React from 'react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { StatusBadge } from '@/components/ui/status-badge';

interface PermissionFlags {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const getColumns = (
  onProjectAction: (project: Project, mode: 'edit' | 'read') => void,
  onDeleteProject: (projectId: string) => void,
  onMakeCopy: (project: Project) => void,
  navigateToProjectDetail: (project: Project) => void,
  permissionFlags: PermissionFlags
): ColumnDef<Project>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader
        column={column}
        title='Project Name'
        className='pl-2'
      />
    ),
    cell: ({ row }) => {
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              className='text-foreground w-full pl-2 text-left hover:text-primary justify-start h-auto py-1'
              onClick={() => navigateToProjectDetail(row.original)}
              disabled={!permissionFlags.canRead}
            >
              <span className='block overflow-hidden text-ellipsis whitespace-nowrap'>
                {row.original.name || ''}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{row.original.name || ''}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    enableHiding: false,
    size: 400,
  },
  {
    accessorKey: 'sanctionAmount',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left'
        column={column}
        title='Sanction Amount'
      />
    ),
    cell: ({ row }) => (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className='w-full text-left'>
            <span className='text-sm text-muted-foreground text-left'>
              ₹{formatIndianNumber(row.original.sanctionAmount || 0)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{numberToText(row.original.sanctionAmount || 0)}</p>
        </TooltipContent>
      </Tooltip>
    ),
    size: 150,
  },
  {
    accessorKey: 'sanctionDos',
    header: ({ column }) => <TableColumnHeader column={column} title='DOS' />,
    cell: ({ row }) => {
      const duration = calculateDuration(
        row.original.sanctionDos,
        row.original.sanctionDoc
      );
      const daysRemaining = calculateDaysRemaining(row.original.sanctionDoc);
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-sm text-muted-foreground truncate cursor-default'>
              {formatDateSlash(row.original.sanctionDos)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className='space-y-1'>
              <p>Duration: {duration}</p>
              <p>{daysRemaining}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'sanctionDoc',
    header: ({ column }) => <TableColumnHeader column={column} title='DOC' />,
    cell: ({ row }) => {
      const duration = calculateDuration(
        row.original.sanctionDos,
        row.original.sanctionDoc
      );
      const daysRemaining = calculateDaysRemaining(row.original.sanctionDoc);
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-sm text-muted-foreground truncate cursor-default'>
              {formatDateSlash(row.original.sanctionDoc)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className='space-y-1'>
              <p>Duration: {duration}</p>
              <p>{daysRemaining}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'projectLocation',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground truncate'>
        {row.original.projectLocation || ''}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <StatusBadge status={row.original.status || undefined} />
    ),
    size: 100,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const { canRead, canUpdate, canDelete } = permissionFlags;

      // Hide actions column if user has no permissions
      if (!canRead && !canUpdate && !canDelete) {
        return null;
      }

      return (
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
            {canUpdate && (
              <DropdownMenuItem
                onClick={() => onProjectAction(row.original, 'edit')}
              >
                Edit
              </DropdownMenuItem>
            )}
            {canUpdate && (
              <DropdownMenuItem onClick={() => onMakeCopy(row.original)}>
                Make a copy
              </DropdownMenuItem>
            )}
            {canRead && (
              <DropdownMenuItem
                onClick={() => onProjectAction(row.original, 'read')}
              >
                View Details
              </DropdownMenuItem>
            )}
            {canDelete && (canRead || canUpdate) && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem
                variant='destructive'
                onClick={() => onDeleteProject(row.original.hashId)}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 50,
  },
];
