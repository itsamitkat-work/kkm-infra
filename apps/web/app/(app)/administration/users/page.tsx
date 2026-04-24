'use client';

import React from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { UsersTable } from './components/users-table';
import { useAuth } from '@/hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { ability, isLoading } = useAuth();
  const canAccessDirectory =
    ability.can('read', 'tenant_members') ||
    ability.can('manage', 'tenant_members');

  return (
    <RouteGuard allow={canAccessDirectory} isLoading={isLoading}>
      <div className='h-full w-full'>
        <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
          <UsersTable />
        </React.Suspense>
      </div>
    </RouteGuard>
  );
}
