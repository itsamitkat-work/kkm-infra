'use client';

import { ColumnDef } from '@tanstack/react-table';

import { TableColumnHeader } from '@/components/tables/table-column-header';
import { resolveProfileAvatarSrc } from '@/lib/profile-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { StatusBadge } from '@/components/ui/status-badge';
import type { User } from '@/types/users';

import { UserRolesCell } from './user-roles-cell';

interface GetColumnsParams {
  onSelectUser: (user: User) => void;
}

function getUserInitials(user: User): string {
  const source = user.fullName?.trim() || user.userName?.trim();
  if (!source) {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function UserProfileCell({
  user,
  onSelectUser,
}: {
  user: User;
  onSelectUser: (user: User) => void;
}) {
  const avatarSrc = resolveProfileAvatarSrc(user.avatarUrl);

  function handleOpenUserDrawer() {
    onSelectUser(user);
  }

  return (
    <Item
      asChild
      variant='default'
      size='sm'
      className='max-w-md border-0 bg-transparent p-0 shadow-none'
    >
      <button
        type='button'
        className='flex w-full min-w-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        onClick={handleOpenUserDrawer}
        aria-label={`Open user details for ${user.fullName || user.userName || 'user'}`}
      >
      <ItemMedia variant='icon' className='self-center'>
        <Avatar className='h-9 w-9'>
          <AvatarImage src={avatarSrc} alt='' />
          <AvatarFallback className='text-xs font-medium'>
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className='min-w-0 gap-0'>
        <ItemTitle className='text-sm font-medium'>
          {user.fullName || '—'}
        </ItemTitle>
        <ItemDescription className='text-xs'>
          {user.userName?.trim() ? `@${user.userName}` : 'No username'}
        </ItemDescription>
      </ItemContent>
      </button>
    </Item>
  );
}

export const getColumns = ({
  onSelectUser,
}: GetColumnsParams): ColumnDef<User>[] => [
  {
    accessorKey: 'fullName',
    id: 'fullName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='User' className='pl-2' />
    ),
    cell: ({ row }) => (
      <div className='pl-2'>
        <UserProfileCell user={row.original} onSelectUser={onSelectUser} />
      </div>
    ),
    enableHiding: false,
    size: 280,
  },
  {
    accessorKey: 'roles',
    header: ({ column }) => <TableColumnHeader column={column} title='Roles' />,
    cell: ({ row }) => <UserRolesCell user={row.original} />,
    size: 280,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <TableColumnHeader className='text-left' column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground text-sm'>
        {row.original.email?.trim() ? row.original.email : '—'}
      </div>
    ),
    size: 250,
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
