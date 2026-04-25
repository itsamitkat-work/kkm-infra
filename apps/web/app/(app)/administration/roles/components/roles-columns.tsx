'use client';

import { ColumnDef } from '@tanstack/react-table';

import type { TenantRole } from '@/app/(app)/administration/roles/api/tenant-roles-api';
import {
  TextCell,
  TableRowActionsMenuCell,
} from '@/components/tables/table-cells';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { Badge } from '@/components/ui/badge';

export function getColumns(
  onRoleAction: (role: TenantRole, mode: 'edit' | 'read') => void,
  onDeleteRole: (id: string) => void,
  canManage: boolean
): ColumnDef<TenantRole>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Name' className='pl-2' />
      ),
      cell: ({ row }) => (
        <TextCell
          label={row.original.name || '—'}
          onClick={() => {
            onRoleAction(row.original, canManage ? 'edit' : 'read');
          }}
          emphasis
          className='pl-2'
          buttonClassName='text-foreground hover:text-primary'
          muted={false}
        />
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
        <TextCell
          label={row.original.slug || '—'}
          variant='description'
          muted={false}
          className='font-mono text-xs'
        />
      ),
      size: 180,
    },
    {
      accessorKey: 'is_system',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Type' />
      ),
      cell: ({ row }) =>
        row.original.is_system ? (
          <Badge variant='secondary'>Built-in</Badge>
        ) : (
          <Badge variant='outline'>Custom</Badge>
        ),
      size: 120,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isCustom = !row.original.is_system;
        return (
          <TableRowActionsMenuCell
            items={[
              ...(canManage
                ? [
                    {
                      type: 'item' as const,
                      key: 'edit',
                      label: 'Edit',
                      onSelect: () => {
                        onRoleAction(row.original, 'edit');
                      },
                    },
                  ]
                : []),
              {
                type: 'item' as const,
                key: 'view',
                label: 'View Details',
                onSelect: () => {
                  onRoleAction(row.original, 'read');
                },
              },
              ...(canManage && isCustom
                ? [
                    { type: 'separator' as const, key: 'sep-before-delete' },
                    {
                      type: 'item' as const,
                      key: 'delete',
                      label: 'Delete',
                      destructive: true,
                      onSelect: () => {
                        onDeleteRole(row.original.id);
                      },
                    },
                  ]
                : []),
            ]}
          />
        );
      },
      size: 50,
    },
  ];
}
