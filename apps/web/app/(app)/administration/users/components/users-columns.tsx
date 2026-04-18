'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User } from '@/types/users';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { UserRolesCell } from './user-roles-cell';
import { StatusBadge } from '@/components/ui/status-badge';

interface GetColumnsParams {
  onOpenDialog: (user: User) => void;
}

export const getColumns = ({
  onOpenDialog,
}: GetColumnsParams): ColumnDef<User>[] => [
  {
    accessorKey: 'userName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Username' className='pl-2' />
    ),
    cell: ({ row }) => (
      <div className='pl-2 text-sm font-medium'>
        {row.original.userName || ''}
      </div>
    ),
    enableHiding: false,
    size: 150,
  },
  {
    accessorKey: 'fullName',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left'
        column={column}
        title='Full Name'
      />
    ),
    cell: ({ row }) => (
      <div className='text-sm'>{row.original.fullName || ''}</div>
    ),
    size: 200,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <TableColumnHeader className='text-left' column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground text-sm'>
        {row.original.email?.trim()
          ? row.original.email
          : '—'}
      </div>
    ),
    size: 250,
  },
  {
    accessorKey: 'roles',
    header: ({ column }) => <TableColumnHeader column={column} title='Roles' />,
    cell: ({ row }) => (
      <UserRolesCell user={row.original} onOpenDialog={onOpenDialog} />
    ),
    size: 200,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
    size: 120,
  },
];
