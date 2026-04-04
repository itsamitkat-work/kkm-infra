'use client';

import { ColumnDef } from '@tanstack/react-table';
import { BasicRate } from '@/hooks/use-basic-rates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const getColumns = (
  onBasicRateAction: (basicRate: BasicRate, mode: 'edit' | 'read') => void,
  onDeleteBasicRate: (hashID: string) => void,
  onSelectMaterial?: (basicRate: BasicRate) => void
): ColumnDef<BasicRate>[] => [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Code' className='pl-2' />
    ),
    cell: ({ row }) => {
      return (
        <div className='pl-2'>
          <div className='block overflow-hidden text-ellipsis whitespace-nowrap'>
            {row.original.code || '—'}
          </div>
        </div>
      );
    },
    enableHiding: false,
    size: 100,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Name' />
    ),
    meta: {
      cellClassName: '!whitespace-normal',
    },
    cell: ({ row }) => {
      const name = row.original.name;
      if (onSelectMaterial) {
        return (
          <button
            type='button'
            onClick={() => onSelectMaterial(row.original)}
            className={cn(
              'block w-full min-w-0 break-words text-left text-sm',
              'cursor-pointer hover:underline hover:text-primary focus:outline-none focus:underline focus:text-primary',
              'overflow-hidden word-break-break-word'
            )}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {name || '—'}
          </button>
        );
      }
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div
              className='text-sm cursor-help break-words min-w-0'
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
              }}
            >
              {name || '—'}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className='max-w-xs'>{name || '—'}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 250,
  },
  {
    accessorKey: 'types',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => {
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.types || '—'}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Unit' />
    ),
    cell: ({ row }) => {
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.unit || '—'}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: 'rate',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Rate' />
    ),
    cell: ({ row }) => {
      const rate = row.original.rate;
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap'>
          ₹{rate?.toLocaleString('en-IN') || '0'}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'stateSchedule',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='State Schedule' />
    ),
    cell: ({ row }) => {
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.stateSchedule || '—'}
        </span>
      );
    },
    size: 150,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            status === 'Active'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}
        >
          {status || '—'}
        </span>
      );
    },
    size: 100,
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
            onClick={() => onBasicRateAction(row.original, 'edit')}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onBasicRateAction(row.original, 'read')}
          >
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => onDeleteBasicRate(row.original.hashID)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
