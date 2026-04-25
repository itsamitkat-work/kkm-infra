'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';

import type { TenantRole } from '@/app/(app)/administration/roles/api/tenant-roles-api';
import {
  TENANT_ROLES_TABLE_ID,
  useTenantRolesQuery,
} from '@/app/(app)/administration/roles/hooks/use-tenant-roles-query';
import { useDeleteTenantRole } from '@/app/(app)/administration/roles/hooks/use-tenant-roles-mutations';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth';
import { useConfirmationDialog } from '@/hooks/use-confirmation-dialog';
import { useOpenClose } from '@/hooks/use-open-close';

import { getColumns } from './roles-columns';
import { getRolesFilterFields } from './roles-filters';
import { RolesDrawer } from './roles-drawer';

export function RolesTable() {
  const { claims, ability } = useAuth();
  const tenantId = claims?.tid ?? null;
  const canRead =
    ability.can('read', 'tenant_roles') ||
    ability.can('manage', 'tenant_roles');
  const canManage = ability.can('manage', 'tenant_roles');

  const drawer = useOpenClose<TenantRole | null>();
  const deleteDialog = useConfirmationDialog();

  const handleCreateRole = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (row: TenantRole, mode: 'edit' | 'read') => {
      if (mode === 'edit' && !canManage) {
        drawer.open(row, 'read');
        return;
      }
      drawer.open(row, mode);
    },
    [drawer, canManage]
  );

  const onClickDeleteRef = React.useRef<(id: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (id) => {
          onClickDeleteRef.current(id);
        },
        canManage
      ),
    [onClickEditOrRead, canManage]
  );

  const controls = useDataTableControls(TENANT_ROLES_TABLE_ID);

  const filterFields = React.useMemo(() => getRolesFilterFields(), []);

  const { query: rolesQuery, invalidate: invalidateRolesQuery } =
    useTenantRolesQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteRoleMutation = useDeleteTenantRole();

  const onClickDelete = React.useCallback(
    (id: string) => {
      deleteDialog.openConfirmation({
        onConfirm: async () => {
          await deleteRoleMutation.mutateAsync(id);
          invalidateRolesQuery();
        },
        itemName: 'role',
      });
    },
    [deleteDialog, deleteRoleMutation, invalidateRolesQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  if (!tenantId) {
    return (
      <div className='text-muted-foreground p-6 text-sm'>
        No active workspace is set. Use the workspace switcher or sign in again.
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className='text-muted-foreground p-6 text-sm'>
        You do not have access to workspace roles.
      </div>
    );
  }

  return (
    <>
      <DataTable<TenantRole>
        query={rolesQuery}
        controls={controls}
        filterFields={filterFields}
        columns={columns}
        searchPlaceholder='Search name or slug...'
        emptyState={{
          itemType: 'role',
          onCreateNew: canManage ? handleCreateRole : undefined,
        }}
        loadingMessage='Loading roles...'
        errorState={
          <TableErrorState
            title='Failed to load roles'
            message={rolesQuery.error?.message || 'An error occurred'}
            onRetry={() => {
              void rolesQuery.refetch();
            }}
          />
        }
        stickyContext='page'
        actions={
          !canManage
            ? undefined
            : {
                end: (
                  <Button type='button' onClick={handleCreateRole}>
                    <IconPlus />
                    Add custom role
                  </Button>
                ),
              }
        }
      />

      {drawer.isOpen && drawer.mode ? (
        <RolesDrawer
          mode={drawer.mode}
          role={drawer.data}
          open={drawer.isOpen}
          canManage={canManage}
          onSubmit={() => {
            drawer.close();
            invalidateRolesQuery();
          }}
          onCancel={drawer.close}
        />
      ) : null}

      {deleteDialog.isOpen && deleteDialog.data ? (
        <DeleteConfirmationDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) =>
            open
              ? deleteDialog.openConfirmation(deleteDialog.data!)
              : deleteDialog.closeConfirmation()
          }
          onConfirm={deleteDialog.data.onConfirm}
          isLoading={
            deleteDialog.data.isLoading || deleteRoleMutation.isPending
          }
          itemName='role'
          itemCount={deleteDialog.data.itemCount}
        />
      ) : null}
    </>
  );
}
