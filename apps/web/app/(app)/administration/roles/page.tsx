import React from 'react';
import { RolesTable } from './components/roles-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function RolesPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <RolesTable />
      </React.Suspense>
    </div>
  );
}
