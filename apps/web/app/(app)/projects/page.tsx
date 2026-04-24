import React from 'react';
import { ProjectsTable } from './components/projects-table';
import { TableLoadingState } from '@/components/tables/table-loading';

export default function ProjectsPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<TableLoadingState />}>
        <ProjectsTable />
      </React.Suspense>
    </div>
  );
}
