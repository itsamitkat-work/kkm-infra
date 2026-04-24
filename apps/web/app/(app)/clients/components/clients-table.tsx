'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { useOpenClose } from '@/hooks/use-open-close';
import { useConfirmationDialog } from '@/hooks/use-confirmation-dialog';
import { useAuth } from '@/hooks/auth';
import type { ClientsListRow } from '@/app/(app)/clients/api/client-api';
import {
  CLIENTS_TABLE_ID,
  useClientsQuery,
} from '@/app/(app)/clients/hooks/use-clients-query';
import { useDeleteClient } from '@/app/(app)/clients/hooks/use-clients-mutations';
import { getColumns } from './clients-columns';
import { defaultClientTableFilters, filterFields } from './client-filters';
import { ClientDrawer } from './client-drawer';

export function ClientsTable() {
  const drawer = useOpenClose<ClientsListRow | null>();
  const confirmation = useConfirmationDialog();
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

  const controls = useDataTableControls(
    CLIENTS_TABLE_ID,
    defaultClientTableFilters
  );

  const { query: clientsQuery, invalidate: invalidateClientsQuery } =
    useClientsQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const onClickDelete = React.useCallback(
    (clientId: string) => {
      confirmation.openConfirmation({
        onConfirm: async () => {
          await deleteClientMutation.mutateAsync(clientId);
          invalidateClientsQuery();
        },
        itemName: 'client',
      });
    },
    [confirmation, deleteClientMutation, invalidateClientsQuery]
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
        filtersInlineWithSearch
        showFilterAddButton={false}
        showFilterClearButton={false}
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
            <Button onClick={handleCreateClient}>
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

      {confirmation.isOpen && confirmation.data && (
        <DeleteConfirmationDialog
          open={confirmation.isOpen}
          onOpenChange={(open) =>
            open
              ? confirmation.openConfirmation(
                  confirmation.data!
                )
              : confirmation.closeConfirmation()
          }
          onConfirm={confirmation.data.onConfirm}
          isLoading={
            confirmation.data.isLoading || deleteClientMutation.isPending
          }
          itemName='client'
          itemCount={confirmation.data.itemCount}
        />
      )}
    </>
  );
}
