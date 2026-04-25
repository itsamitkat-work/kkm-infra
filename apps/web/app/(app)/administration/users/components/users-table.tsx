'use client';

import * as React from 'react';

import { getColumns } from './users-columns';
import { UserDrawer } from './user-drawer';
import { USERS_TABLE_ID, useUsersQuery } from '../hooks/use-users-query';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { useAuth } from '@/hooks/auth';
import { useOpenClose } from '@/hooks/use-open-close';
import type { User } from '@/types/users';

export function UsersTable() {
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;

  const userDrawer = useOpenClose<User>();

  const handleSelectUser = React.useCallback(
    (selected: User) => {
      userDrawer.open(selected, 'edit');
    },
    [userDrawer]
  );

  const columns = React.useMemo(
    () => getColumns({ onSelectUser: handleSelectUser }),
    [handleSelectUser]
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
        searchPlaceholder='Search by name or email…'
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

      {userDrawer.isOpen && userDrawer.data ? (
        <UserDrawer
          open={userDrawer.isOpen}
          user={userDrawer.data}
          tenantId={tenantId}
          onClose={userDrawer.close}
        />
      ) : null}
    </>
  );
}
