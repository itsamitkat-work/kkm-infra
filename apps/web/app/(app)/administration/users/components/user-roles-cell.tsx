'use client';

import * as React from 'react';

import { User } from '@/types/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconChevronDown, IconPlus } from '@tabler/icons-react';

interface UserRolesCellProps {
  user: User;
  onOpenDialog: (user: User) => void;
}

export function UserRolesCell({ user, onOpenDialog }: UserRolesCellProps) {
  const roles = user.roles ?? [];
  const hasRoles = roles.length > 0;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {hasRoles ? (
        <div className='flex max-w-[200px] flex-wrap gap-1'>
          {roles.map((role, index) => (
            <Badge key={role.hashId ?? index} variant='secondary' className='truncate'>
              {role.name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className='text-muted-foreground text-sm'>No roles</span>
      )}
      <Button
        type='button'
        variant='dashed'
        size='xs'
        title='Manage roles'
        onClick={() => onOpenDialog(user)}
      >
        {hasRoles ? (
          <IconChevronDown className='h-4 w-4' />
        ) : (
          <IconPlus className='h-4 w-4' />
        )}
      </Button>
    </div>
  );
}
