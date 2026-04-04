'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { MasterItem } from '@/hooks/items/types';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { getColumns } from './items-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { ITEMS_TABLE_ID, useItemsQuery } from '@/hooks/items/use-items-query';
import { useDeleteItem } from '@/hooks/items/use-item-mutations';
import { ItemDrawer } from './item-drawer';
import { getItemsFilterFields } from './items-filters';
import { useHeadsSubheads } from '@/hooks/use-heads-subheads';
import { createFilter, type Filter } from '@/components/ui/filters';
import { useRouter } from 'next/navigation';
import { useClients } from '@/hooks/clients/use-clients';
import type { SortingState } from '@tanstack/react-table';

const DEFAULT_FILTERS = [
  createFilter('ScheduleRate', 'is', []),
  createFilter('Head', 'is', []),
  createFilter('SubHead', 'is', []),
  createFilter('justification-status', 'is', ['ALL']),
  createFilter('verification-status', 'is', ['ALL']),
];
const DEFAULT_SORT = [
  {
    id: 'scheduleRate',
    desc: true,
  },
];

export const SERVICE_ITEMS_FILTERS = [
  createFilter('ScheduleRate', 'is', ['Service Items']),
  createFilter('Head', 'is', []),
  createFilter('SubHead', 'is', []),
  createFilter('justification-status', 'is', ['ALL']),
  createFilter('verification-status', 'is', ['ALL']),
];

interface ItemsTableProps {
  onSelectItem?: (item: MasterItem) => void;
  /** When true, sticky header/controls use dialog-appropriate offsets */
  inDialog?: boolean;
  /** Override table id (e.g. for dialog so filters are separate from main table) */
  tableId?: string;
  /** Initial filters when table is used in a dialog (e.g. ScheduleRate=Service Items) */
  defaultFilters?: Filter[];
  /** Initial sort */
  defaultSort?: SortingState;
}

export function ItemsTable({
  onSelectItem,
  inDialog,
  tableId: tableIdProp,
  defaultFilters = DEFAULT_FILTERS,
  defaultSort = DEFAULT_SORT,
}: ItemsTableProps = {}) {
  const drawer = useOpenClose<MasterItem | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const router = useRouter();
  const tableId = tableIdProp ?? ITEMS_TABLE_ID;

  const handleCreateItem = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (item: MasterItem, mode: 'edit' | 'read') => {
      drawer.open(item, mode);
    },
    [drawer]
  );

  const onClickCopy = React.useCallback(
    (item: MasterItem) => {
      const copy: MasterItem = {
        ...item,
        hashId: '',
        code: '',
        dsrCode: null,
        name: `(Copy of) - ${item.name}`,
      };
      drawer.open(copy, 'create');
    },
    [drawer]
  );
  const onClickViewJustification = React.useCallback(
    (item: MasterItem) => {
      router.push(
        `/items/${encodeURIComponent(item.hashId)}?tab=justification`
      );
    },
    [router]
  );

  const onClickName = React.useCallback(
    (item: MasterItem) => {
      router.push(`/items/${encodeURIComponent(item.hashId)}`);
    },
    [router]
  );

  const onClickDeleteRef = React.useRef<(itemId: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (itemId) => onClickDeleteRef.current(itemId),
        onClickCopy,
        onClickViewJustification,
        onSelectItem,
        inDialog ? undefined : onClickName
      ),
    [
      onClickEditOrRead,
      onClickCopy,
      onClickViewJustification,
      onSelectItem,
      inDialog,
      onClickName,
    ]
  );

  const controls = useDataTableControls(tableId, defaultFilters, defaultSort);

  const { data: clients } = useClients();

  const scheduleOptions = React.useMemo(
    () =>
      (clients ?? []).map((c) => ({
        value: c.scheduleName,
        label: c.scheduleName,
      })),
    [clients]
  );

  const { headOptions, subheadOptions, headsWithSubheads } = useHeadsSubheads();

  const selectedHead = React.useMemo(() => {
    const headFilter = controls.filters.find((f) => f.field === 'Head');
    const value = headFilter?.values?.[0];
    return typeof value === 'string' ? value : undefined;
  }, [controls.filters]);

  const filterFields = React.useMemo(
    () =>
      getItemsFilterFields(headOptions, subheadOptions, {
        selectedHead,
        headsWithSubheads,
        scheduleOptions,
      }),
    [
      headOptions,
      subheadOptions,
      selectedHead,
      headsWithSubheads,
      scheduleOptions,
    ]
  );

  const { query: itemsQuery, invalidate: invalidateItemsQuery } = useItemsQuery(
    {
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    }
  );

  const deleteItemMutation = useDeleteItem();

  const onClickDelete = React.useCallback(
    (itemId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteItemMutation.mutateAsync(itemId);
          invalidateItemsQuery();
        },
        itemName: 'item',
      });
    },
    [deleteConfirmation, deleteItemMutation, invalidateItemsQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  return (
    <>
      <DataTable<MasterItem>
        query={itemsQuery}
        controls={controls}
        filterFields={filterFields}
        showFilterClearButton={false}
        columns={columns}
        searchPlaceholder='Search by Name or Code'
        emptyState={{
          itemType: 'item',
          onCreateNew: handleCreateItem,
        }}
        loadingMessage='Loading items...'
        errorState={
          <TableErrorState
            title='Failed to load items'
            message={itemsQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        stickyContext={inDialog ? 'dialog' : 'page'}
        actions={
          inDialog
            ? undefined
            : {
                end: (
                  <Button size='sm' onClick={handleCreateItem}>
                    <IconPlus />
                    <span className='hidden lg:inline'>Create Item</span>
                  </Button>
                ),
              }
        }
      />

      {drawer.isOpen && drawer.mode && (
        <ItemDrawer
          mode={drawer.mode}
          item={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateItemsQuery();
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
            deleteConfirmation.data.isLoading ?? deleteItemMutation.isPending
          }
          itemName='item'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
