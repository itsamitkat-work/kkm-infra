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
  //   const roles = user.roles || [];
  //   const hasRoles = roles.length > 0;

  return (
    <div className='flex items-center gap-2'>
      {/* {hasRoles ? (
        <div className='flex flex-wrap gap-1'>
          {roles.map((role, index) => (
            <Badge key={role.hashId || index} variant='secondary'>
              {role.name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className='text-sm text-muted-foreground'>No roles</span>
      )} */}

      <Button variant='dashed' size='xs' onClick={() => onOpenDialog(user)}>
        {/* {hasRoles ? (
          <IconChevronDown className='h-4 w-4' />
        ) : (
          <IconPlus className='h-4 w-4' />
        )} */}
        Manage Roles
      </Button>
    </div>
  );
}
