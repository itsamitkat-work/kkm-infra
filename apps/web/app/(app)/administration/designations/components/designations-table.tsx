'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Designation } from '../hooks/use-designations-query';
import { TableErrorState } from '@/components/tables/table-error';
import { getColumns } from './designations-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  DESIGNATIONS_TABLE_ID,
  useDesignationsQuery,
} from '../hooks/use-designations-query';
import { SubDesignationsList } from './sub-designations-list';
import { Row } from '@tanstack/react-table';
import { filterFields } from './designations-filters';
import { useEmployeeFilterOptions } from '@/app/(app)/hr/employees/hooks/use-employee-filter-options';
import { createFilter } from '@/components/ui/filters';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { useDeleteDesignation } from '@/hooks/use-designations-mutations';
import { DesignationsDrawer } from './designations-drawer';

export function DesignationsTable() {
  const drawer = useOpenClose<Designation | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const { employeeTypes } = useEmployeeFilterOptions();

  // Default filters to apply on initial load - empty filter that will be populated
  const defaultFilters = React.useMemo(
    () => [createFilter('employeeTypeHashId', 'is', [])],
    []
  );

  const controls = useDataTableControls(DESIGNATIONS_TABLE_ID, defaultFilters);

  const handleCreateDesignation = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (designation: Designation, mode: 'edit' | 'read') => {
      drawer.open(designation, mode);
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(hashId: string) => void>(() => {});

  const { query: designationsQuery, invalidate: invalidateDesignationsQuery } =
    useDesignationsQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const deleteDesignationMutation = useDeleteDesignation();

  const onClickDelete = React.useCallback(
    (id: string) => {
      if (!id) {
        console.error('Designation id is missing');
        return;
      }
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteDesignationMutation.mutateAsync({ hashId: id });
          invalidateDesignationsQuery();
        },
        itemName: 'designation',
      });
    },
    [deleteConfirmation, deleteDesignationMutation, invalidateDesignationsQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (hashId) => onClickDeleteRef.current(hashId)
      ),
    [onClickEditOrRead]
  );

  const filterFieldsWithOptions = React.useMemo(
    () =>
      filterFields.map((field) => {
        if (field.key === 'employeeTypeHashId') {
          return {
            ...field,
            options: employeeTypes,
          };
        }
        return field;
      }),
    [employeeTypes]
  );

  const renderExpandedRow = React.useCallback(
    (row: Row<Designation>) => {
      return <SubDesignationsList designation={row.original} />;
    },
    []
  );

  return (
    <>
      <DataTable<Designation>
        query={designationsQuery}
        controls={controls}
        filterFields={filterFieldsWithOptions}
        columns={columns}
        searchPlaceholder='Search by name'
        emptyState={{
          itemType: 'designation',
          onCreateNew: handleCreateDesignation,
        }}
        loadingMessage='Loading designations...'
        errorState={
          <TableErrorState
            title='Failed to load designations'
            message={designationsQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        renderExpandedRow={renderExpandedRow}
        actions={{
          end: (
            <Button size='sm' onClick={handleCreateDesignation}>
              <IconPlus />
              <span className='hidden lg:inline'>Create Designation</span>
            </Button>
          ),
        }}
      />

      {drawer.isOpen && drawer.mode && (
        <DesignationsDrawer
          mode={drawer.mode}
          designation={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateDesignationsQuery();
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
            deleteDesignationMutation.isPending
          }
          itemName='designation'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
