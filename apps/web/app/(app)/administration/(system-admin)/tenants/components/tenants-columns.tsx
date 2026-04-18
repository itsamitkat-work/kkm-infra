'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { IconDotsVertical } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import type { TenantAdminRow } from '@/hooks/use-tenants-admin';

export function getTenantsAdminColumns(
  onEdit: (row: TenantAdminRow) => void,
  onDeleteTenant: (id: string) => void,
): ColumnDef<TenantAdminRow>[] {
  return [
    {
      accessorKey: 'display_name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Display name' className='pl-2' />
      ),
      cell: ({ row }) => (
        <div className='pl-2'>
          <span className='block overflow-hidden text-ellipsis whitespace-nowrap'>
            {row.original.display_name ?? '—'}
          </span>
        </div>
      ),
      enableHiding: false,
      size: 200,
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Slug' />
      ),
      cell: ({ row }) => (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-muted-foreground'>
          {row.original.slug}
        </span>
      ),
      size: 160,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Name' />
      ),
      cell: ({ row }) => (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap'>
          {row.original.name}
        </span>
      ),
      size: 200,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Created' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground block overflow-hidden text-ellipsis whitespace-nowrap text-sm'>
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
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
            <DropdownMenuItem
              onClick={() => {
                onEdit(row.original);
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              onClick={() => {
                onDeleteTenant(row.original.id);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ];
}
