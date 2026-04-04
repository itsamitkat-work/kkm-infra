import React from 'react';
import { UsersTable } from './components/users-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <UsersTable />
      </React.Suspense>
    </div>
  );
}

