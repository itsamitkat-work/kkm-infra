'use client';

import { Badge } from '@/components/ui/badge';
import type { User } from '@/types/users';

const MAX_VISIBLE_ROLE_TAGS = 3;

interface UserRolesCellProps {
  user: User;
}

export function UserRolesCell({ user }: UserRolesCellProps) {
  const roles = user.roles ?? [];

  if (roles.length === 0) {
    return <span className='text-muted-foreground text-sm'>No roles</span>;
  }

  const visibleRoles = roles.slice(0, MAX_VISIBLE_ROLE_TAGS);
  const overflowCount = roles.length - visibleRoles.length;

  return (
    <div className='flex flex-wrap items-center gap-1'>
      {visibleRoles.map((role, index) => (
        <Badge key={role.hashId ?? `${role.name}-${index}`} variant='ghost'>
          {role.name}
        </Badge>
      ))}
      {overflowCount > 0 ? (
        <Badge variant='outline' className='shrink-0 font-normal tabular-nums'>
          +{overflowCount}
        </Badge>
      ) : null}
    </div>
  );
}
