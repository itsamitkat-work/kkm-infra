'use client';

import { ColumnDef } from '@tanstack/react-table';
import { SubDesignation } from '../hooks/use-sub-designations-query';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconDotsVertical } from '@tabler/icons-react';

export const getSubDesignationsColumns = (
  onSubDesignationAction: (
    subDesignation: SubDesignation,
    mode: 'edit' | 'read'
  ) => void,
  onDeleteSubDesignation: (hashId: string) => void
): ColumnDef<SubDesignation>[] => [
  {
    accessorKey: 'name',
    header: () => <div className='text-left pl-2 font-medium'>Name</div>,
    cell: ({ row }) => (
      <div className='pl-2 text-sm font-medium'>{row.original.name || ''}</div>
    ),
    enableHiding: false,
    size: 200,
    enableSorting:false
  },
  {
    accessorKey: 'code',
    header: () => <div className='text-left font-medium'>Code</div>,
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.code || ''}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: 'basicRate',
    header: () => <div className='text-left font-medium'>Basic Rate</div>,
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.basicRate || 0}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: 'newRate',
    header: () => <div className='text-left font-medium'>New Rate</div>,
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.newRate || 0}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: 'revisedDate',
    header: () => <div className='text-left font-medium'>Revised Date</div>,
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.revisedDate
          ? new Date(row.original.revisedDate).toLocaleDateString()
          : '—'}
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'status',
    header: () => <div className='text-center font-medium'>Status</div>,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            onClick={() => onSubDesignationAction(row.original, 'edit')}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSubDesignationAction(row.original, 'read')}
          >
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => onDeleteSubDesignation(row.original.id)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
