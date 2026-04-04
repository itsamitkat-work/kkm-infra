'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MasterItem } from '@/hooks/items/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { createIndexColumn } from '@/components/tables/index-column';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { TableLabelCell } from '@/components/tables/table-label-cell';
import { formatIndianNumber } from '@/lib/numberToText';
import { EyeIcon } from 'lucide-react';

export const getColumns = (
  onItemAction: (item: MasterItem, mode: 'edit' | 'read') => void,
  onDeleteItem: (itemId: string) => void,
  onMakeCopy: (item: MasterItem) => void,
  onViewJustification: (item: MasterItem) => void,
  onSelectItem?: (item: MasterItem) => void,
  onNameClick?: (item: MasterItem) => void
): ColumnDef<MasterItem>[] => [
  createIndexColumn<MasterItem>(),
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Name' className='pl-2' />
    ),
    cell: ({ row }) => {
      const onClick = onNameClick ?? onSelectItem;
      return (
        <TableLabelCell
          label={row.original.name}
          subLabel={row.original.nickName || undefined}
          onClick={onClick ? () => onClick(row.original) : undefined}
        />
      );
    },
    enableHiding: false,
    size: 300,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => <TableColumnHeader column={column} title='Code' />,
    cell: ({ row }) => {
      const code = row.original.code || '';
      const dsrId = row.original.dsrId;
      return (
        <div>
          <div className='block overflow-hidden text-ellipsis whitespace-nowrap'>
            {code}
          </div>
          {dsrId && (
            <div className='text-xs text-muted-foreground truncate mt-0.5'>
              DSR: {dsrId}
            </div>
          )}
        </div>
      );
    },
    enableHiding: false,
    size: 150,
  },
  {
    accessorKey: 'scheduleRate',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Schedule' />
    ),
    cell: ({ row }) => (
      <TableLabelCell label={row.original.scheduleRate || ''} muted />
    ),
    size: 100,
  },
  {
    accessorKey: 'head',
    header: ({ column }) => <TableColumnHeader column={column} title='Head' />,
    cell: ({ row }) => (
      <TableLabelCell label={row.original.head || '-'} muted />
    ),
    size: 140,
  },
  {
    accessorKey: 'subHead',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Sub Head' />
    ),
    cell: ({ row }) => (
      <TableLabelCell label={row.original.subhead || '-'} muted />
    ),
    size: 140,
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => <TableColumnHeader column={column} title='Unit' />,
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground truncate'>
        {row.original.unit || ''}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: 'rate',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Rate' className='justify-end' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground break-words text-right mr-3'>
        <span className='whitespace-nowrap inline-block'>₹</span>
        <span className='whitespace-nowrap inline-block'>
          {formatIndianNumber(row.original.rate || 0)}
        </span>
      </div>
    ),
    size: 150,
  },

  ...(onSelectItem
    ? []
    : [
        {
          id: 'actions',
          cell: ({ row }: { row: { original: MasterItem } }) => (
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
                  onClick={() => onItemAction(row.original, 'edit')}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMakeCopy(row.original)}>
                  Make a copy
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onItemAction(row.original, 'read')}
                >
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onViewJustification(row.original)}
                >
                  <EyeIcon className='w-4 h-4' /> Justification
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => onDeleteItem(row.original.hashId)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
          size: 50,
        },
      ]),
];
