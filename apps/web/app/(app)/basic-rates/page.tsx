import React, { Suspense } from 'react';
import { BasicRatesTable } from './components/basic-rates-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function BasicRatesPage() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <BasicRatesTable />
      </Suspense>
    </div>
  );
}
