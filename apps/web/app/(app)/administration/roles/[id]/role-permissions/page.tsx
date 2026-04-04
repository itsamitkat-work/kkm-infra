'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { RolePermissionsGrid } from './components/role-permissions-grid';
import { useRolesQuery } from '../../hooks/use-roles-query';
import { TableLoadingState } from '@/components/tables/table-loading';

interface RolePermissionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function RolePermissionsPage({
  params,
}: RolePermissionsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roleId = resolvedParams.id;

  // Fetch role details to get the name
  const { query: rolesQuery } = useRolesQuery({
    search: '',
    filters: [],
    sorting: [],
  });

  const role = React.useMemo(() => {
    if (!rolesQuery.data?.pages) return null;
    const allRoles = rolesQuery.data.pages.flatMap((page) => page.data);
    return allRoles.find((r) => r.id === roleId);
  }, [rolesQuery.data, roleId]);

  if (rolesQuery.isLoading) {
    return <TableLoadingState />;
  }

  return (
    <div className='h-full w-full flex flex-col'>
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div className='space-y-2'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/administration/roles'>
                  Roles
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {role?.name || 'Role Permissions'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className='flex-1 overflow-auto p-6'>
        <RolePermissionsGrid roleId={roleId} />
      </div>
    </div>
  );
}
