import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FactorsTable } from './components/factors-table';

export default function FactorPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <FactorsTable />
      </React.Suspense>
    </div>
  );
}
