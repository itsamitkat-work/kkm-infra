'use client';

import React from 'react';

import { UsersTable } from './components/users-table';
import { RequireAbility } from '@/components/auth/require-ability';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  return (
    <RequireAbility action='manage' subject='tenant_members'>
      <div className='h-full w-full'>
        <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
          <UsersTable />
        </React.Suspense>
      </div>
    </RequireAbility>
  );
}
