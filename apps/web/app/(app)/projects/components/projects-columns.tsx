'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { ProjectsListRow } from '../api/project-api';
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
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { TextCell } from '@/components/tables/table-cells';
import { StatusBadge } from '@/components/ui/status-badge';
import { parseProjectMeta } from '@/lib/projects/project-meta';

interface PermissionFlags {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function listRowDates(row: ProjectsListRow) {
  const m = parseProjectMeta(row.meta);
  return {
    sanctionDos: m.sanction_dos ?? null,
    sanctionDoc: m.sanction_doc ?? null,
    sanctionAmount: m.sanction_amount ?? 0,
    projectLocation: m.location ?? null,
  };
}

export const getColumns = (
  onProjectAction: (project: ProjectsListRow, mode: 'edit' | 'read') => void,
  onDeleteProject: (projectId: string) => void,
  onMakeCopy: (project: ProjectsListRow) => void,
  navigateToProjectDetail: (project: ProjectsListRow) => void,
  permissionFlags: PermissionFlags
): ColumnDef<ProjectsListRow>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader
        column={column}
        title='Project Name'
        className='pl-2'
      />
    ),
    cell: ({ row }) => (
      <TextCell
        label={row.original.name || ''}
        onClick={() => navigateToProjectDetail(row.original)}
        disabled={!permissionFlags.canRead}
        className='pl-2'
        buttonClassName='text-foreground hover:text-primary'
        tooltipDelayDuration={500}
      />
    ),
    enableHiding: false,
    size: 400,
  },
  {
    id: 'sanctionamount',
    accessorFn: (row) => listRowDates(row).sanctionAmount,
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left'
        column={column}
        title='Sanction Amount'
      />
    ),
    cell: ({ row }) => {
      const amount = listRowDates(row.original).sanctionAmount;
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='w-full text-left'>
              <span className='text-sm text-muted-foreground text-left'>
                ₹{formatIndianNumber(amount || 0)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{numberToText(amount || 0)}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 150,
  },
  {
    id: 'sanctiondos',
    accessorFn: (row) => listRowDates(row).sanctionDos,
    header: ({ column }) => <TableColumnHeader column={column} title='DOS' />,
    cell: ({ row }) => {
      const { sanctionDos, sanctionDoc } = listRowDates(row.original);
      const duration = calculateDuration(sanctionDos, sanctionDoc);
      const daysRemaining = calculateDaysRemaining(sanctionDoc);
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-sm text-muted-foreground truncate cursor-default'>
              {formatDateSlash(sanctionDos)}
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
    id: 'sanctiondoc',
    accessorFn: (row) => listRowDates(row).sanctionDoc,
    header: ({ column }) => <TableColumnHeader column={column} title='DOC' />,
    cell: ({ row }) => {
      const { sanctionDos, sanctionDoc } = listRowDates(row.original);
      const duration = calculateDuration(sanctionDos, sanctionDoc);
      const daysRemaining = calculateDaysRemaining(sanctionDoc);
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-sm text-muted-foreground truncate cursor-default'>
              {formatDateSlash(sanctionDoc)}
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
    id: 'projectlocation',
    accessorFn: (row) => listRowDates(row).projectLocation,
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground truncate'>
        {listRowDates(row.original).projectLocation || ''}
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
                onClick={() => onDeleteProject(row.original.id)}
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
