'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { EmployeeType } from '../hooks/use-employee-types-query';
import { TableErrorState } from '@/components/tables/table-error';
import { getColumns } from './employee-types-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  EMPLOYEE_TYPES_TABLE_ID,
  useEmployeeTypesQuery,
} from '../hooks/use-employee-types-query';

export function EmployeeTypesTable() {
  const controls = useDataTableControls(EMPLOYEE_TYPES_TABLE_ID);

  const { query: employeeTypesQuery } = useEmployeeTypesQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  const columns = React.useMemo(() => getColumns(), []);

  return (
    <DataTable<EmployeeType>
      query={employeeTypesQuery}
      controls={controls}
      filterFields={[]}
      columns={columns}
      searchPlaceholder='Search by name...'
      emptyState={{
        itemType: 'employee type',
      }}
      loadingMessage='Loading employee types...'
      errorState={
        <TableErrorState
          title='Failed to load employee types'
          message={employeeTypesQuery.error?.message || 'An error occurred'}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
