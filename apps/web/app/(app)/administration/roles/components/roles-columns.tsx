'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Role } from '@/types/roles';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  IconShield,
  IconDotsVertical,
  IconSettings,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export const getColumns = (
  navigateToRolePermissions: (role: Role) => void,
  onDeleteRole: (roleId: string) => void,
  onEditRole: (role: Role) => void
): ColumnDef<Role>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Role Name' className='pl-2' />
    ),
    cell: ({ row }) => {
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              className='text-foreground w-full pl-2 text-left hover:text-primary justify-start h-auto py-1'
              onClick={() => navigateToRolePermissions(row.original)}
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
    size: 250,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <TableColumnHeader className='text-left' column={column} title='Code' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.code || ''}
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'isSystemRole',
    header: ({ column }) => <TableColumnHeader column={column} title='Type' />,
    cell: ({ row }) =>
      row.original.isSystemRole ? (
        <Badge variant='default' className='inline-flex items-center gap-1.5'>
          <IconShield className='size-3.5' />
          System
        </Badge>
      ) : null,
    size: 120,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
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
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem
            onClick={() => navigateToRolePermissions(row.original)}
          >
            <IconSettings className='mr-2 h-4 w-4' />
            Manage Permissions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEditRole(row.original)}>
            <IconEdit className='mr-2 h-4 w-4' />
            Edit
          </DropdownMenuItem>
          {!row.original.isSystemRole && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => onDeleteRole(row.original.id)}
              >
                <IconTrash className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
