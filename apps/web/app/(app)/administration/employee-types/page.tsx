import React from 'react';
import { EmployeeTypesTable } from './components/employee-types-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmployeeTypesPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <EmployeeTypesTable />
      </React.Suspense>
    </div>
  );
}
