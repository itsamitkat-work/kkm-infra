'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';

import { DataTable } from '@/components/tables/data-table/data-table';
import { TableErrorState } from '@/components/tables/table-error';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import {
  TENANTS_ADMIN_TABLE_ID,
  useDeleteTenantAdmin,
  useTenantsAdminQuery,
  type TenantAdminRow,
} from '@/hooks/use-tenants-admin';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TenantDrawer } from './tenant-drawer';
import { getTenantsAdminColumns } from './tenants-columns';

const TENANT_FILTER_FIELDS: [] = [];

export function TenantsTable() {
  const drawer = useOpenClose<TenantAdminRow | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteTenantMutation = useDeleteTenantAdmin();

  const handleCreate = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const handleEdit = React.useCallback(
    (row: TenantAdminRow) => {
      drawer.open(row, 'edit');
    },
    [drawer],
  );

  const onClickDelete = React.useCallback(
    (id: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteTenantMutation.mutateAsync(id);
        },
        itemName: 'tenant',
      });
    },
    [deleteConfirmation, deleteTenantMutation],
  );

  const columns = React.useMemo(
    () => getTenantsAdminColumns(handleEdit, onClickDelete),
    [handleEdit, onClickDelete],
  );

  const controls = useDataTableControls(
    TENANTS_ADMIN_TABLE_ID,
    [],
    [{ id: 'display_name', desc: false }],
  );

  const { query: tenantsQuery, invalidate } = useTenantsAdminQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  return (
    <>
      <DataTable<TenantAdminRow>
        query={tenantsQuery}
        controls={controls}
        filterFields={TENANT_FILTER_FIELDS}
        columns={columns}
        searchPlaceholder='Search name or slug…'
        emptyState={{
          itemType: 'tenant',
          onCreateNew: handleCreate,
        }}
        loadingMessage='Loading tenants…'
        errorState={
          <TableErrorState
            title='Failed to load tenants'
            message={tenantsQuery.error?.message ?? 'An error occurred'}
            onRetry={() => {
              void tenantsQuery.refetch();
            }}
          />
        }
        showFilters={false}
        showFilterAddButton={false}
        showFilterClearButton={false}
        actions={{
          end: (
            <Button type='button' size='sm' onClick={handleCreate}>
              <IconPlus />
              <span className='hidden lg:inline'>Add tenant</span>
            </Button>
          ),
        }}
      />

      <TenantDrawer
        open={drawer.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            drawer.close();
          }
        }}
        mode={drawer.mode === 'edit' ? 'edit' : 'create'}
        tenant={drawer.data}
        onSaved={() => {
          void invalidate();
        }}
      />

      {deleteConfirmation.isOpen && deleteConfirmation.data && (
        <DeleteConfirmationDialog
          open={deleteConfirmation.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              deleteConfirmation.closeDeleteConfirmation();
            }
          }}
          onConfirm={deleteConfirmation.data.onConfirm}
          isLoading={deleteTenantMutation.isPending}
          itemName='tenant'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
