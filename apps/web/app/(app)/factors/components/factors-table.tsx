'use client';

import * as React from 'react';
import { DataTable } from '@/components/tables/data-table/data-table';
import { TableErrorState } from '@/components/tables/table-error';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  FACTORS_TABLE_ID,
  FactorRow,
  MaterialFactorForFactor,
  useFactorsQuery,
} from '../hooks/use-factors-query';
import { getColumns } from './factors-columns';
import { FactorMaterialsTable } from './factor-materials-table';

export function FactorsTable() {
  const controls = useDataTableControls(FACTORS_TABLE_ID);

  const { query: factorsQuery, getMaterialsForFactor } = useFactorsQuery({
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
  });

  const columns = React.useMemo(() => getColumns(), []);

  return (
    <DataTable<FactorRow>
      query={factorsQuery}
      controls={controls}
      filterFields={[]}
      columns={columns}
      searchPlaceholder='Search by factor, material or value...'
      emptyState={{
        itemType: 'factor',
      }}
      loadingMessage='Loading factors...'
      errorState={
        <TableErrorState
          title='Failed to load factors'
          message={factorsQuery.error?.message || 'An error occurred'}
          onRetry={() => window.location.reload()}
        />
      }
      showFilters={false}
      showColumnFilter={false}
      renderExpandedRow={(row) => {
        const factorName = row.original.factorName;
        const materials: MaterialFactorForFactor[] =
          getMaterialsForFactor(factorName);
        return <FactorMaterialsTable materials={materials} />;
      }}
    />
  );
}
