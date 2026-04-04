'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IndentTable } from './components/indent-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function IndentsPage() {
  return (
    <div className='h-full w-full bg-background'>
      <React.Suspense
        fallback={
          <div className='p-4 space-y-4'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-8 w-32' />
            </div>
            <Skeleton className='h-[300px] w-full' />
          </div>
        }
      >
        <IndentsDashboard />
      </React.Suspense>
    </div>
  );
}

function IndentsDashboard() {
  return (
    <div className='h-full w-full'>
      <Suspense fallback={<TableLoadingState />}>
        <IndentTable />
      </Suspense>
    </div>
  );
}
