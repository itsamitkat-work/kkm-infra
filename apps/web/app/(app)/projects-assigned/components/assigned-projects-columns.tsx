'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import React from 'react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { AssignedProject } from '@/hooks/projects/use-assigned-projects-query';

export const getAssignedProjectsColumns = (
  navigateToProjectDetail: (project: AssignedProject) => void
): ColumnDef<AssignedProject>[] => [
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
    size: 500,
  },
  {
    accessorKey: 'assignedWorkersCount',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Assigned Workers' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.assignedWorkersCount ?? 0}
      </div>
    ),
    size: 150,
  },
];
