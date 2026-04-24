'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasicRate } from '@/app/(app)/basic-rates/api/basic-rate-api';
import {
  BASIC_RATES_TABLE_ID,
  useBasicRatesQuery,
} from '@/app/(app)/basic-rates/hooks/use-basic-rates-query';
import { useBasicRateTypesQuery } from '@/app/(app)/basic-rates/hooks/use-basic-rate-types-query';
import { useDeleteBasicRate } from '@/app/(app)/basic-rates/hooks/use-basic-rates-mutations';
import { useScheduleVersionOptions } from '@/hooks/use-schedule-source-versions';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useConfirmationDialog } from '@/hooks/use-confirmation-dialog';
import { getColumns } from './basic-rates-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { getBasicRatesFilterFields } from './basic-rates-filters';
import { createFilter } from '@/components/ui/filters';
import { BasicRatesDrawer } from './basic-rates-drawer';
import { useAuth } from '@/hooks/auth';

export function BasicRatesTable() {
  const { ability } = useAuth();
  const canManage = ability.can('manage', 'basic_rates');

  const drawer = useOpenClose<BasicRate | null>();
  const deleteDialog = useConfirmationDialog();

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
        canManage
      ),
    [onClickEditOrRead, canManage]
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

  const { data: typeRows = [] } = useBasicRateTypesQuery();
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
      deleteDialog.openConfirmation({
        onConfirm: async () => {
          await deleteBasicRateMutation.mutateAsync(id);
          invalidateBasicRatesQuery();
        },
        itemName: 'basic rate',
      });
    },
    [deleteDialog, deleteBasicRateMutation, invalidateBasicRatesQuery]
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
        stickyContext='page'
        actions={
          !canManage
            ? undefined
            : {
                end: (
                  <Button onClick={handleCreateBasicRate}>
                    <IconPlus />
                    Create Basic Rate
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

      {deleteDialog.isOpen && deleteDialog.data && (
        <DeleteConfirmationDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) =>
            open
              ? deleteDialog.openConfirmation(deleteDialog.data!)
              : deleteDialog.closeConfirmation()
          }
          onConfirm={deleteDialog.data.onConfirm}
          isLoading={
            deleteDialog.data.isLoading || deleteBasicRateMutation.isPending
          }
          itemName='basic rate'
          itemCount={deleteDialog.data.itemCount}
        />
      )}
    </>
  );
}
