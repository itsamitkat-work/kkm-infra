'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { ClientsListRow } from '@/hooks/useClients';
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
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { RecordStatusBadge } from '@/components/ui/record-status-badge';
import type { Database } from '@kkm/db';

interface PermissionFlags {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type RecordStatus = Database['public']['Enums']['record_status'];

function toRecordStatus(value: string | null | undefined): RecordStatus | null {
  if (value === 'active' || value === 'inactive' || value === 'deprecated') {
    return value;
  }
  return null;
}

export const getColumns = (
  onClientAction: (client: ClientsListRow, mode: 'edit' | 'read') => void,
  onDeleteClient: (clientId: string) => void,
  onMakeCopy: (client: ClientsListRow) => void,
  permissionFlags: PermissionFlags
): ColumnDef<ClientsListRow>[] => [
  {
    accessorKey: 'display_name',
    header: ({ column }) => (
      <TableColumnHeader
        column={column}
        title='Display Name'
        className='pl-2'
      />
    ),
    cell: ({ row }) => (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className='pl-2 font-medium text-foreground truncate'>
            {row.original.display_name || '—'}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{row.original.display_name || '—'}</p>
        </TooltipContent>
      </Tooltip>
    ),
    enableHiding: false,
    size: 260,
  },
  {
    accessorKey: 'full_name',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Full Name' />
    ),
    cell: ({ row }) => (
      <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
        {row.original.full_name || '—'}
      </span>
    ),
    size: 280,
  },
  {
    accessorKey: 'gstin',
    header: ({ column }) => <TableColumnHeader column={column} title='GSTIN' />,
    cell: ({ row }) => (
      <span className='block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-muted-foreground'>
        {row.original.gstin || '—'}
      </span>
    ),
    size: 170,
  },
  {
    id: 'default_schedule',
    accessorFn: (row) => row.default_schedule_display_name ?? '',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Default Schedule' />
    ),
    cell: ({ row }) => (
      <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
        {row.original.default_schedule_display_name || '—'}
      </span>
    ),
    enableSorting: false,
    size: 200,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <RecordStatusBadge status={toRecordStatus(row.original.status)} />
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
                onClick={() => onClientAction(row.original, 'edit')}
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
                onClick={() => onClientAction(row.original, 'read')}
              >
                View Details
              </DropdownMenuItem>
            )}
            {canDelete && (canRead || canUpdate) && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem
                variant='destructive'
                onClick={() => onDeleteClient(row.original.id)}
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
