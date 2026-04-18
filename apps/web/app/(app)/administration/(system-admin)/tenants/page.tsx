import React, { Suspense } from 'react';

import { TableLoadingState } from '@/components/tables/table-loading';

import { TenantsTable } from './components/tenants-table';

export default function TenantsAdminPage() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <TenantsTable />
      </Suspense>
    </div>
  );
}
