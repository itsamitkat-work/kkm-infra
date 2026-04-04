import React from 'react';
import { ProjectsTable } from './components/projects-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <ProjectsTable />
      </React.Suspense>
    </div>
  );
}
