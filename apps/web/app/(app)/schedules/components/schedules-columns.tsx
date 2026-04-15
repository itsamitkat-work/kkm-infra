'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { ScheduleSourceRow } from '@/hooks/schedules/use-schedule-sources';
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
import { RecordStatusBadge } from '@/components/ui/record-status-badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getSchedulesColumns(
  onScheduleAction: (row: ScheduleSourceRow, mode: 'edit' | 'read') => void,
  onDeleteSchedule: (id: string) => void,
  canManage: boolean,
  canDeleteSchedule: boolean
): ColumnDef<ScheduleSourceRow>[] {
  return [
    {
      id: 'expand',
      header: () => <span className='sr-only'>Expand editions</span>,
      cell: ({ row }) => {
        const expanded = row.getIsExpanded();
        return (
          <Button
            type='button'
            variant='ghost'
            mode='icon'
            className='text-muted-foreground size-8 shrink-0'
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse editions' : 'Expand editions'}
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            <span className='relative inline-flex size-4 items-center justify-center'>
              <ChevronDown
                className={cn(
                  'absolute size-4 transition-all duration-200',
                  expanded
                    ? 'rotate-0 opacity-100'
                    : 'rotate-[-90deg] opacity-0'
                )}
              />
              <ChevronRight
                className={cn(
                  'absolute size-4 transition-all duration-200',
                  expanded ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                )}
              />
            </span>
          </Button>
        );
      },
      size: 44,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'display_name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Display name' />
      ),
      cell: ({ row }) => (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.display_name || '—'}
        </span>
      ),
      size: 220,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Name' className='pl-2' />
      ),
      cell: ({ row }) => (
        <div className='pl-2'>
          <div className='block overflow-hidden text-ellipsis whitespace-nowrap'>
            {row.original.name}
          </div>
        </div>
      ),
      enableHiding: false,
      size: 200,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Type' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm capitalize'>
          {row.original.type ?? '—'}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => (
        <RecordStatusBadge status={row.original.status ?? undefined} />
      ),
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
            {canManage ? (
              <DropdownMenuItem
                onClick={() => onScheduleAction(row.original, 'edit')}
              >
                Edit
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => onScheduleAction(row.original, 'read')}
            >
              View details
            </DropdownMenuItem>
            {canManage && canDeleteSchedule ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => onDeleteSchedule(row.original.id)}
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
}
