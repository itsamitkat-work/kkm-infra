'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { Role } from '@/types/roles';
import { TableErrorState } from '@/components/tables/table-error';
import { useRouter } from 'next/navigation';
import { getColumns } from './roles-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  ROLES_TABLE_ID,
  useRolesQuery,
  useDeleteRole,
} from '../hooks/use-roles-query';
import { useOpenClose } from '@/hooks/use-open-close';
import { RoleDrawer } from './role-drawer';
import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

export function RolesTable() {
  const router = useRouter();
  const drawer = useOpenClose<Role | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteRoleMutation = useDeleteRole();

  const controls = useDataTableControls(ROLES_TABLE_ID);

  const { query: rolesQuery, invalidate: invalidateRolesQuery } = useRolesQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  const navigateToRolePermissions = React.useCallback(
    (role: Role) => {
      router.push(`/administration/roles/${role.id}/role-permissions`);
    },
    [router]
  );

  const handleCreateRole = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const handleEditRole = React.useCallback(
    (role: Role) => {
      drawer.open(role, 'edit');
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(roleId: string) => void>(() => {});

  const onClickDelete = React.useCallback(
    (roleId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteRoleMutation.mutateAsync(roleId);
          invalidateRolesQuery();
          deleteConfirmation.closeDeleteConfirmation();
        },
        itemName: 'role',
      });
    },
    [deleteConfirmation, deleteRoleMutation, invalidateRolesQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  const columns = React.useMemo(
    () =>
      getColumns(
        navigateToRolePermissions,
        (roleId) => onClickDeleteRef.current(roleId),
        handleEditRole
      ),
    [navigateToRolePermissions, handleEditRole]
  );

  return (
    <>
      <DataTable<Role>
        query={rolesQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        searchPlaceholder='Search by Role Name or Code...'
        emptyState={{
          itemType: 'role',
          onCreateNew: handleCreateRole,
        }}
        loadingMessage='Loading roles...'
        errorState={
          <TableErrorState
            title='Failed to load roles'
            message={rolesQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        actions={{
          end: (
            <Button size='sm' onClick={handleCreateRole}>
              <IconPlus />
              <span className='hidden lg:inline'>Add Role</span>
            </Button>
          ),
        }}
      />

      {drawer.isOpen && drawer.mode && (
        <RoleDrawer
          mode={drawer.mode}
          role={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateRolesQuery();
          }}
          onCancel={drawer.close}
        />
      )}

      {deleteConfirmation.isOpen && deleteConfirmation.data && (
        <DeleteConfirmationDialog
          open={deleteConfirmation.isOpen}
          onOpenChange={(open) =>
            open
              ? deleteConfirmation.openDeleteConfirmation(
                  deleteConfirmation.data!
                )
              : deleteConfirmation.closeDeleteConfirmation()
          }
          onConfirm={deleteConfirmation.data.onConfirm}
          isLoading={
            deleteConfirmation.data.isLoading ||
            deleteRoleMutation.isPending
          }
          itemName='role'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
