'use client';

import * as React from 'react';

import { AssignRolesDialog } from './assign-roles-dialog';
import { getColumns } from './users-columns';
import { useAssignRole } from '../hooks/use-assign-role-mutation';
import { useRemoveRole } from '../hooks/use-remove-role-mutation';
import { useTenantRolesAdminQuery } from '../hooks/use-tenant-roles-admin-query';
import { USERS_TABLE_ID, useUsersQuery } from '../hooks/use-users-query';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { useAuth } from '@/hooks/auth';
import { useOpenClose } from '@/hooks/use-open-close';
import type { User } from '@/types/users';

export function UsersTable() {
  const dialog = useOpenClose<User>();
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;

  const assignRoleMutation = useAssignRole({
    suppressSuccessToast: true,
    suppressErrorToast: true,
  });

  const removeRoleMutation = useRemoveRole({
    suppressSuccessToast: true,
    suppressErrorToast: true,
  });

  const rolesQuery = useTenantRolesAdminQuery(tenantId);
  const allRoles = rolesQuery.data ?? [];

  const onClickManageRoles = React.useCallback(
    (user: User) => {
      dialog.open(user);
    },
    [dialog],
  );

  const columns = React.useMemo(
    () => getColumns({ onOpenDialog: onClickManageRoles }),
    [onClickManageRoles],
  );

  const controls = useDataTableControls(USERS_TABLE_ID);

  const { query: usersQuery } = useUsersQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  if (!tenantId) {
    return (
      <div className='text-muted-foreground p-6 text-sm'>
        No active workspace is set. Use the workspace switcher or sign in again.
      </div>
    );
  }

  return (
    <>
      <DataTable<User>
        query={usersQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        searchPlaceholder='Search by username or display name…'
        emptyState={{
          itemType: 'user',
        }}
        loadingMessage='Loading users…'
        errorState={
          <TableErrorState
            title='Failed to load users'
            message={usersQuery.error?.message ?? 'An error occurred'}
            onRetry={() => {
              void usersQuery.refetch();
            }}
          />
        }
      />

      {dialog.isOpen && dialog.data && (
        <AssignRolesDialog
          open={dialog.isOpen}
          onOpenChange={(open) => {
            if (open) {
              dialog.open(dialog.data!);
            } else {
              dialog.close();
            }
          }}
          user={dialog.data}
          allRoles={allRoles}
          assignRoleMutation={assignRoleMutation}
          removeRoleMutation={removeRoleMutation}
          isLoadingRoles={rolesQuery.isLoading}
        />
      )}
    </>
  );
}
