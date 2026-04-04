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
import { ProjectEngineer } from '../api/supervisors-api';

export const getProjectEngineersColumns = (
  onSelectProjectEngineer: (projectEngineer: ProjectEngineer) => void
): ColumnDef<ProjectEngineer>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader
        column={column}
        title='Project Engineer Name'
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
              onClick={() => onSelectProjectEngineer(row.original)}
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
    accessorKey: 'projectCount',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Project Count' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.projectCount ?? 0}
      </div>
    ),
    size: 150,
  },
];
