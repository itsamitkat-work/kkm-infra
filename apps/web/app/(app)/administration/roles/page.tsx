'use client';

import React, { Suspense } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { TableLoadingState } from '@/components/tables/table-loading';
import { useAuth } from '@/hooks/auth';

import { RolesTable } from './components/roles-table';

export default function RolesPage() {
  const { ability, isLoading } = useAuth();
  const canAccessRoles =
    ability.can('read', 'tenant_roles') ||
    ability.can('manage', 'tenant_roles');

  return (
    <RouteGuard allow={canAccessRoles} isLoading={isLoading}>
      <div className='h-full w-full'>
        <Suspense fallback={<TableLoadingState />}>
          <RolesTable />
        </Suspense>
      </div>
    </RouteGuard>
  );
}
