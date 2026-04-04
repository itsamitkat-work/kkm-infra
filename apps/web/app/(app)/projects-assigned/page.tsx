'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useRouter } from 'next/navigation';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { getAssignedProjectsColumns } from './components/assigned-projects-columns';
import { useAuth } from '@/hooks/auth/use-auth';
import { type FilterFieldConfig } from '@/components/ui/filters';
import {
  ASSIGNED_PROJECTS_QUERY_KEY,
  AssignedProject,
  useAssignedProjectsInfiniteQuery,
} from '@/hooks/projects/use-assigned-projects-query';

const filterFields: FilterFieldConfig[] = [
  {
    group: 'Filters',
    fields: [],
  },
];

export default function ProjectsAssignedPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <AssignedProjectsTable />
      </React.Suspense>
    </div>
  );
}

const AssignedProjectsTable = () => {
  const router = useRouter();
  const { getUser } = useAuth();
  const currentUser = getUser();
  const userHashId = currentUser?.hashId ?? null;

  const controls = useDataTableControls(ASSIGNED_PROJECTS_QUERY_KEY);

  const { query: projectsQuery } = useAssignedProjectsInfiniteQuery(userHashId);

  const onClickNavigateToProjectDetail = React.useCallback(
    (project: AssignedProject) => {
      router.push(`/projects/${project.hashId}`);
    },
    [router]
  );

  const columns = React.useMemo(
    () => getAssignedProjectsColumns(onClickNavigateToProjectDetail),
    [onClickNavigateToProjectDetail]
  );

  return (
    <DataTable<AssignedProject>
      query={projectsQuery}
      controls={controls}
      filterFields={filterFields}
      columns={columns}
      searchPlaceholder='Search by Project Name...'
      emptyState={{
        itemType: 'assigned project',
      }}
      loadingMessage='Loading assigned projects...'
      errorState={
        <TableErrorState
          title='Failed to load assigned projects'
          message={projectsQuery.error?.message || 'An error occurred'}
          onRetry={() => window.location.reload()}
        />
      }
      showFilters={false}
    />
  );
};
