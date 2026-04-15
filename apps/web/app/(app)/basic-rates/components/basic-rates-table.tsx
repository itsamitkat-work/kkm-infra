'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasicRate } from '@/hooks/useBasicRates';
import {
  BASIC_RATES_TABLE_ID,
  useBasicRatesQuery,
  useDeleteBasicRate,
  useBasicRateTypeOptions,
} from '@/hooks/useBasicRates';
import { useScheduleVersionOptions } from '@/hooks/use-schedule-source-versions';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { getColumns } from './basic-rates-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { getBasicRatesFilterFields } from './basic-rates-filters';
import { createFilter } from '@/components/ui/filters';
import { BasicRatesDrawer } from './basic-rates-drawer';
import { useAuth } from '@/hooks/auth';
interface BasicRatesTableProps {
  onSelectMaterial?: (material: BasicRate) => void;
  inDialog?: boolean;
}

export function BasicRatesTable({
  onSelectMaterial,
  inDialog,
}: BasicRatesTableProps = {}) {
  const { ability } = useAuth();
  const canManage = ability.can('manage', 'basic_rates');

  const drawer = useOpenClose<BasicRate | null>();
  const deleteConfirmation = useDeleteConfirmation();

  const handleCreateBasicRate = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (basicRate: BasicRate, mode: 'edit' | 'read') => {
      if (mode === 'edit' && !canManage) {
        drawer.open(basicRate, 'read');
        return;
      }
      drawer.open(basicRate, mode);
    },
    [drawer, canManage]
  );

  const onClickDeleteRef = React.useRef<(id: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (id) => onClickDeleteRef.current(id),
        onSelectMaterial,
        canManage
      ),
    [onClickEditOrRead, onSelectMaterial, canManage]
  );

  const defaultFilters = React.useMemo(
    () => [
      createFilter('schedule_source_version_id', 'is', []),
      createFilter('types', 'is', []),
      createFilter('status', 'is_any_of', []),
    ],
    []
  );

  const controls = useDataTableControls(BASIC_RATES_TABLE_ID, defaultFilters);

  const { data: typeRows = [] } = useBasicRateTypeOptions();
  const { data: scheduleRows = [] } = useScheduleVersionOptions();

  const typeFilterOptions = React.useMemo(
    () =>
      typeRows.map((t) => ({
        value: t.name,
        label: t.name,
      })),
    [typeRows]
  );

  const scheduleFilterOptions = React.useMemo(
    () =>
      scheduleRows.map((s) => ({
        value: s.id,
        label:
          s.year != null ? `${s.display_name} (${s.year})` : s.display_name,
      })),
    [scheduleRows]
  );

  const filterFieldsWithOptions = React.useMemo(
    () => getBasicRatesFilterFields(typeFilterOptions, scheduleFilterOptions),
    [typeFilterOptions, scheduleFilterOptions]
  );

  const { query: basicRatesQuery, invalidate: invalidateBasicRatesQuery } =
    useBasicRatesQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteBasicRateMutation = useDeleteBasicRate();

  const onClickDelete = React.useCallback(
    (id: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteBasicRateMutation.mutateAsync(id);
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
        searchPlaceholder='Search code or description...'
        emptyState={{
          itemType: 'basic rate',
          onCreateNew: canManage ? handleCreateBasicRate : undefined,
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
          inDialog || !canManage
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
