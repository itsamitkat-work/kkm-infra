'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Employee } from '../types/employee';
import { EmployeeDrawer } from './employee-drawer';
import { TableErrorState } from '@/components/tables/table-error';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import {
  useDeleteEmployee,
  useEmployeesQuery,
  EMPLOYEES_TABLE_ID,
} from '../hooks/use-employees-query';
import { getColumns } from './employees-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { getEmployeeFilterFields } from './employee-filters';
import { useRouter } from 'next/navigation';
import { useEmployeeFilterOptions } from '../hooks/use-employee-filter-options';

export function EmployeesTable() {
  const router = useRouter();
  const drawer = useOpenClose<Employee | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteEmployeeMutation = useDeleteEmployee();

  const handleCreateEmployee = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (employee: Employee, mode: 'edit' | 'read') => {
      drawer.open(employee, mode);
    },
    [drawer]
  );

  const onNavigateToDetail = React.useCallback(
    (employee: Employee) => {
      router.push(`/hr/employees/${employee.id}`);
    },
    [router]
  );

  const onClickDeleteRef = React.useRef<(employeeId: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (employeeId) => onClickDeleteRef.current(employeeId),
        onNavigateToDetail
      ),
    [onClickEditOrRead, onNavigateToDetail]
  );

  const controls = useDataTableControls(EMPLOYEES_TABLE_ID);

  // Fetch filter options
  const filterOptions = useEmployeeFilterOptions();
  const filterFields = React.useMemo(
    () =>
      getEmployeeFilterFields(
        filterOptions.designations,
        filterOptions.employeeTypes
      ),
    [filterOptions.designations, filterOptions.employeeTypes]
  );

  const { query: employeesQuery, invalidate: invalidateEmployeesQuery } =
    useEmployeesQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const onClickDelete = React.useCallback(
    (employeeId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteEmployeeMutation.mutateAsync(employeeId);
          invalidateEmployeesQuery();
          deleteConfirmation.closeDeleteConfirmation();
        },
        itemName: 'employee',
      });
    },
    [deleteConfirmation, deleteEmployeeMutation, invalidateEmployeesQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  return (
    <>
      <DataTable<Employee>
        query={employeesQuery}
        controls={controls}
        filterFields={filterFields}
        columns={columns}
        searchPlaceholder='Search by Name, Phone, or Code...'
        emptyState={{
          itemType: 'employee',
          onCreateNew: handleCreateEmployee,
        }}
        loadingMessage='Loading employees...'
        errorState={
          <TableErrorState
            title='Failed to load employees'
            message={employeesQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        actions={{
          end: (
            <Button size='sm' onClick={handleCreateEmployee}>
              <IconPlus />
              <span className='hidden lg:inline'>Add Employee</span>
            </Button>
          ),
        }}
      />

      {drawer.isOpen && drawer.mode && (
        <EmployeeDrawer
          mode={drawer.mode}
          employee={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateEmployeesQuery();
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
            deleteEmployeeMutation.isPending
          }
          itemName='employee'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
