'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { User } from '@/types/users';
import { TableErrorState } from '@/components/tables/table-error';
import { getColumns } from './users-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { USERS_TABLE_ID, useUsersQuery } from '../hooks/use-users-query';
import { useRolesQuery } from '@/app/(app)/administration/roles/hooks/use-roles-query';
import { useAssignRole } from '../hooks/use-assign-role-mutation';
import { useRemoveRole } from '../hooks/use-remove-role-mutation';
import { useOpenClose } from '@/hooks/use-open-close';
import { AssignRolesDialog } from './assign-roles-dialog';

export function UsersTable() {
  const dialog = useOpenClose<User>();

  const assignRoleMutation = useAssignRole({
    suppressSuccessToast: true, // We'll show custom toast in dialog
    suppressErrorToast: true, // We'll show custom toast in dialog
  });

  const removeRoleMutation = useRemoveRole({
    suppressSuccessToast: true, // We'll show custom toast in dialog
    suppressErrorToast: true, // We'll show custom toast in dialog
  });

  // Fetch all roles once in the parent
  const { query: rolesQuery } = useRolesQuery({
    search: '',
    filters: [],
    sorting: [],
  });

  // Get all roles from pages
  const allRoles = React.useMemo(() => {
    if (!rolesQuery.data?.pages) return [];
    return rolesQuery.data.pages.flatMap((page) => page.data);
  }, [rolesQuery.data]);

  const onClickManageRoles = React.useCallback(
    (user: User) => {
      dialog.open(user);
    },
    [dialog]
  );

  const columns = React.useMemo(
    () => getColumns({ onOpenDialog: onClickManageRoles }),
    [onClickManageRoles]
  );

  const controls = useDataTableControls(USERS_TABLE_ID);

  const { query: usersQuery } = useUsersQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  return (
    <>
      <DataTable<User>
        query={usersQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        searchPlaceholder='Search by Username, Full Name, or Email...'
        emptyState={{
          itemType: 'user',
        }}
        loadingMessage='Loading users...'
        errorState={
          <TableErrorState
            title='Failed to load users'
            message={usersQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
      />

      {dialog.isOpen && dialog.data && (
        <AssignRolesDialog
          open={dialog.isOpen}
          onOpenChange={(open) =>
            open ? dialog.open(dialog.data!) : dialog.close()
          }
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
