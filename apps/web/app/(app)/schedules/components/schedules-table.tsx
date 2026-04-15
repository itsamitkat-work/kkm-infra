'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { ScheduleSourceRow } from '@/hooks/schedules/use-schedule-sources';
import {
  SCHEDULE_SOURCES_TABLE_ID,
  useScheduleSourcesQuery,
} from '@/hooks/schedules/use-schedule-sources';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { getSchedulesColumns } from './schedules-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { ScheduleSourceDrawer } from './schedule-source-drawer';
import { useAuth } from '@/hooks/auth';
import { useDeleteScheduleSource } from '@/hooks/schedules/use-schedule-source-mutations';
import { Row } from '@tanstack/react-table';
import { ScheduleSourceVersionsPanel } from './schedule-source-versions-panel';

export function SchedulesTable() {
  const { ability } = useAuth();
  const canManage = ability.can('manage', 'schedules');

  const drawer = useOpenClose<ScheduleSourceRow | null>();
  const deleteConfirmation = useDeleteConfirmation();

  const handleCreate = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (row: ScheduleSourceRow, mode: 'edit' | 'read') => {
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
      getSchedulesColumns(
        onClickEditOrRead,
        (id) => onClickDeleteRef.current(id),
        canManage
      ),
    [onClickEditOrRead, canManage]
  );

  const defaultFilters = React.useMemo(() => [], []);

  const controls = useDataTableControls(SCHEDULE_SOURCES_TABLE_ID, defaultFilters);

  const { query: schedulesQuery, invalidate: invalidateSchedulesQuery } =
    useScheduleSourcesQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteMutation = useDeleteScheduleSource();

  const onClickDelete = React.useCallback(
    (id: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteMutation.mutateAsync(id);
          invalidateSchedulesQuery();
        },
        itemName: 'schedule',
      });
    },
    [deleteConfirmation, deleteMutation, invalidateSchedulesQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  const renderExpandedRow = React.useCallback(
    (row: Row<ScheduleSourceRow>) => (
      <ScheduleSourceVersionsPanel
        source={row.original}
        isExpanded={row.getIsExpanded()}
        canManage={canManage}
      />
    ),
    [canManage]
  );

  return (
    <>
      <DataTable<ScheduleSourceRow>
        query={schedulesQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        searchPlaceholder='Search by name or display name…'
        emptyState={{
          itemType: 'schedule',
          onCreateNew: canManage ? handleCreate : undefined,
        }}
        loadingMessage='Loading schedules…'
        errorState={
          <TableErrorState
            title='Failed to load schedules'
            message={schedulesQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        actions={
          canManage
            ? {
                end: (
                  <Button size='sm' onClick={handleCreate}>
                    <IconPlus />
                    <span className='hidden lg:inline'>Create schedule</span>
                  </Button>
                ),
              }
            : undefined
        }
        renderExpandedRow={renderExpandedRow}
      />

      {drawer.isOpen && drawer.mode && (
        <ScheduleSourceDrawer
          mode={drawer.mode}
          scheduleSource={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateSchedulesQuery();
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
            deleteConfirmation.data.isLoading || deleteMutation.isPending
          }
          itemName='schedule'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
