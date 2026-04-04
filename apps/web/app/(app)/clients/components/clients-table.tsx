'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Client } from '@/hooks/clients/use-clients';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { getColumns } from './clients-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { CLIENTS_TABLE_ID, useClientsQuery } from '../hooks/use-clients-query';
import { ClientDrawer } from './client-drawer';
import { useDeleteClient } from '@/hooks/clients/use-client-mutations';

export function ClientsTable() {
  const drawer = useOpenClose<Client | null>();
  const deleteConfirmation = useDeleteConfirmation();

  const handleCreateClient = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (client: Client, mode: 'edit' | 'read') => {
      drawer.open(client, mode);
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(clientId: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(onClickEditOrRead, (clientId) =>
        onClickDeleteRef.current(clientId)
      ),
    [onClickEditOrRead]
  );

  const controls = useDataTableControls(CLIENTS_TABLE_ID);

  const { query: clientsQuery, invalidate: invalidateClientsQuery } =
    useClientsQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteClientMutation = useDeleteClient();

  const onClickDelete = React.useCallback(
    (clientId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteClientMutation.mutateAsync({ hashId: clientId });
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
      <DataTable<Client>
        query={clientsQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        searchPlaceholder='Search by Client Name...'
        emptyState={{
          itemType: 'client',
          onCreateNew: handleCreateClient,
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
          end: (
            <Button size='sm' onClick={handleCreateClient}>
              <IconPlus />
              <span className='hidden lg:inline'>Create Client</span>
            </Button>
          ),
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
