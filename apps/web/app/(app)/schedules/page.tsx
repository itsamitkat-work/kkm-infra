import React, { Suspense } from 'react';
import { SchedulesTable } from './components/schedules-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function SchedulesPage() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <SchedulesTable />
      </Suspense>
    </div>
  );
}
