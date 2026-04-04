import React, { Suspense } from 'react';
import { ItemsTable } from './components/items-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function ItemsPage() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <ItemsTable />
      </Suspense>
    </div>
  );
}
