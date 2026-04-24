'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { useAuth } from '@/hooks/auth';
import {
  CLIENTS_TABLE_ID,
  useClientsQuery,
  useDeleteClient,
  type ClientsListRow,
} from '@/hooks/useClients';
import { getColumns } from './clients-columns';
import { filterFields } from './client-filters';
import { ClientDrawer } from './client-drawer';

export function ClientsTable() {
  const drawer = useOpenClose<ClientsListRow | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteClientMutation = useDeleteClient();
  const { ability } = useAuth();

  const permissionFlags = React.useMemo(
    () => ({
      canRead: ability.can('read', 'clients'),
      canUpdate: ability.can('update', 'clients'),
      canDelete: ability.can('delete', 'clients'),
      canCreate: ability.can('create', 'clients'),
    }),
    [ability]
  );

  const handleCreateClient = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (client: ClientsListRow, mode: 'edit' | 'read') => {
      drawer.open(client, mode);
    },
    [drawer]
  );

  const openClientFromRow = React.useCallback(
    (client: ClientsListRow) => {
      if (permissionFlags.canUpdate) {
        onClickEditOrRead(client, 'edit');
        return;
      }
      if (permissionFlags.canRead) {
        onClickEditOrRead(client, 'read');
      }
    },
    [onClickEditOrRead, permissionFlags.canRead, permissionFlags.canUpdate]
  );

  const onClickCopy = React.useCallback(
    (client: ClientsListRow) => {
      const copy = {
        ...client,
        display_name: `${client.display_name} (Copy)`,
      };
      drawer.open(copy, 'create');
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(clientId: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (clientId) => onClickDeleteRef.current(clientId),
        onClickCopy,
        openClientFromRow,
        permissionFlags
      ),
    [onClickEditOrRead, onClickCopy, openClientFromRow, permissionFlags]
  );

  const controls = useDataTableControls(CLIENTS_TABLE_ID);

  const { query: clientsQuery, invalidate: invalidateClientsQuery } =
    useClientsQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const onClickDelete = React.useCallback(
    (clientId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteClientMutation.mutateAsync(clientId);
          invalidateClientsQuery();
        },
        itemName: 'client',
      });
    },
    [deleteConfirmation, deleteClientMutation, invalidateClientsQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  return (
    <>
      <DataTable<ClientsListRow>
        query={clientsQuery}
        controls={controls}
        filterFields={filterFields}
        columns={columns}
        searchPlaceholder='Search by display name or full name…'
        emptyState={{
          itemType: 'client',
          onCreateNew: permissionFlags.canCreate
            ? handleCreateClient
            : undefined,
        }}
        loadingMessage='Loading clients...'
        errorState={
          <TableErrorState
            title='Failed to load clients'
            message={clientsQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        actions={{
          end: permissionFlags.canCreate ? (
            <Button size='sm' onClick={handleCreateClient}>
              <IconPlus />
              <span className='hidden lg:inline'>Create Client</span>
            </Button>
          ) : undefined,
        }}
      />

      {drawer.isOpen && drawer.mode && (
        <ClientDrawer
          mode={drawer.mode}
          client={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateClientsQuery();
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
            deleteConfirmation.data.isLoading || deleteClientMutation.isPending
          }
          itemName='client'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
