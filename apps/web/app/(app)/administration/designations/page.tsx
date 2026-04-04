import React from 'react';
import { DesignationsTable } from './components/designations-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function DesignationsPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <DesignationsTable />
      </React.Suspense>
    </div>
  );
}
