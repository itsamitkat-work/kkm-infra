'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { BasicRate } from '@/hooks/use-basic-rates';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { getColumns } from './basic-rates-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  BASIC_RATES_TABLE_ID,
  useBasicRatesQuery,
} from '../hooks/use-basic-rates-query';
import { useDeleteBasicRate } from '@/hooks/use-basic-rates-mutations';
import { filterFields, getBasicRatesFilterFields } from './basic-rates-filters';
import { createFilter } from '@/components/ui/filters';
import { BasicRatesDrawer } from './basic-rates-drawer';
import { useMasterTypesList } from '@/hooks/use-master-types';

interface BasicRatesTableProps {
  onSelectMaterial?: (material: BasicRate) => void;
  inDialog?: boolean;
}

export function BasicRatesTable({
  onSelectMaterial,
  inDialog,
}: BasicRatesTableProps = {}) {
  const drawer = useOpenClose<BasicRate | null>();
  const deleteConfirmation = useDeleteConfirmation();

  const handleCreateBasicRate = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (basicRate: BasicRate, mode: 'edit' | 'read') => {
      drawer.open(basicRate, mode);
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(hashID: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (hashID) => onClickDeleteRef.current(hashID),
        onSelectMaterial
      ),
    [onClickEditOrRead, onSelectMaterial]
  );

  // Default filters to apply on initial load
  const defaultFilters = React.useMemo(
    () => [createFilter('types', 'is', []), createFilter('code', 'is', [])], // Default to 'Material' type
    []
  );

  const controls = useDataTableControls(BASIC_RATES_TABLE_ID, defaultFilters);

  const { items: materialTypes } = useMasterTypesList('MaterialType');
  const { items: materialGroups } = useMasterTypesList('MaterialGroup');
  const { items: materialCategories } = useMasterTypesList('MaterialCategory');

  const filterFieldsWithOptions = React.useMemo(
    () =>
      getBasicRatesFilterFields(
        materialTypes.map((item) => ({
          value: item.hashid,
          label: item.name,
        })),
        materialGroups.map((item) => ({
          value: item.hashid,
          label: item.name,
        })),
        materialCategories.map((item) => ({
          value: item.hashid,
          label: item.name,
        }))
      ),
    [materialTypes, materialGroups, materialCategories]
  );

  const { query: basicRatesQuery, invalidate: invalidateBasicRatesQuery } =
    useBasicRatesQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteBasicRateMutation = useDeleteBasicRate();

  const onClickDelete = React.useCallback(
    (hashID: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteBasicRateMutation.mutateAsync({ hashID });
          invalidateBasicRatesQuery();
        },
        itemName: 'basic rate',
      });
    },
    [deleteConfirmation, deleteBasicRateMutation, invalidateBasicRatesQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  return (
    <>
      <DataTable<BasicRate>
        query={basicRatesQuery}
        controls={controls}
        filterFields={filterFieldsWithOptions}
        columns={columns}
        searchPlaceholder='Search by Name...'
        emptyState={{
          itemType: 'basic rate',
          onCreateNew: handleCreateBasicRate,
        }}
        loadingMessage='Loading basic rates...'
        errorState={
          <TableErrorState
            title='Failed to load basic rates'
            message={basicRatesQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        stickyContext={inDialog ? 'dialog' : 'page'}
        actions={
          inDialog
            ? undefined
            : {
                end: (
                  <Button size='sm' onClick={handleCreateBasicRate}>
                    <IconPlus />
                    <span className='hidden lg:inline'>Create Basic Rate</span>
                  </Button>
                ),
              }
        }
      />

      {drawer.isOpen && drawer.mode && (
        <BasicRatesDrawer
          mode={drawer.mode}
          basicRate={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateBasicRatesQuery();
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
            deleteBasicRateMutation.isPending
          }
          itemName='basic rate'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
