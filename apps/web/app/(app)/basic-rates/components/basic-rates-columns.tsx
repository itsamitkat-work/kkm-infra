'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  type BasicRate,
  BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME,
} from '@/hooks/useBasicRates';
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
import { RecordStatusBadge } from '@/components/ui/record-status-badge';

export const getColumns = (
  onBasicRateAction: (basicRate: BasicRate, mode: 'edit' | 'read') => void,
  onDeleteBasicRate: (id: string) => void,
  onSelectMaterial: ((basicRate: BasicRate) => void) | undefined,
  canManage: boolean
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
    accessorKey: 'description',
    header: ({ column }) => <TableColumnHeader column={column} title='Name' />,
    meta: {
      cellClassName: '!whitespace-normal',
    },
    cell: ({ row }) => {
      const description = row.original.description;
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
            {description || '—'}
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
              {description || '—'}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className='max-w-xs'>{description || '—'}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 250,
  },
  {
    accessorKey: 'basic_rate_type_id',
    header: ({ column }) => <TableColumnHeader column={column} title='Type' />,
    cell: ({ row }) => {
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.basic_rate_types?.name ?? '—'}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => <TableColumnHeader column={column} title='Unit' />,
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
    header: ({ column }) => <TableColumnHeader column={column} title='Rate' />,
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
    id: BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME,
    accessorFn: (row) =>
      row.schedule_source_versions?.display_name ??
      row.schedule_source_versions?.name ??
      '',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Schedule' />
    ),
    cell: ({ row }) => {
      const label =
        row.original.schedule_source_versions?.display_name ??
        row.original.schedule_source_versions?.name ??
        '—';
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {label}
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
    cell: ({ row }) => <RecordStatusBadge status={row.original.status} />,
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
          {canManage ? (
            <DropdownMenuItem
              onClick={() => onBasicRateAction(row.original, 'edit')}
            >
              Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => onBasicRateAction(row.original, 'read')}
          >
            View Details
          </DropdownMenuItem>
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => onDeleteBasicRate(row.original.id)}
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
