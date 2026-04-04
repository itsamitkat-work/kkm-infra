import React, { Suspense } from 'react';
import { ClientsTable } from './components/clients-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function ClientsPage() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <ClientsTable />
      </Suspense>
    </div>
  );
}
