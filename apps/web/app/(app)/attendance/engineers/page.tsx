'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useRouter } from 'next/navigation';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { useAuth } from '@/hooks/auth/use-auth';
import { type FilterFieldConfig } from '@/components/ui/filters';
import { PROJECT_ENGINEERS_QUERY_KEY } from '../hooks/use-project-engineers-query';
import { ProjectEngineer } from '../api/supervisors-api';
import { useProjectEngineersQuery } from '../hooks/use-project-engineers-query';
import { getProjectEngineersColumns } from '../components/enginners-columns';

const filterFields: FilterFieldConfig[] = [
  {
    group: 'Filters',
    fields: [],
  },
];

export default function EngineersPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <EngineersTable />
      </React.Suspense>
    </div>
  );
}

const EngineersTable = () => {
  const router = useRouter();
  const { getUser } = useAuth();
  const currentUser = getUser();
  const projectEngineerId = currentUser?.hashId ?? null;

  const controls = useDataTableControls(PROJECT_ENGINEERS_QUERY_KEY);

  const { query: engineersQuery } = useProjectEngineersQuery(projectEngineerId);

  const onClickNavigateToAttendance = React.useCallback(
    (engineer: ProjectEngineer) => {
      router.push(
        `/attendance?userId=${engineer.hashId}&userName=${encodeURIComponent(engineer.name)}`
      );
    },
    [router]
  );

  const columns = React.useMemo(
    () => getProjectEngineersColumns(onClickNavigateToAttendance),
    [onClickNavigateToAttendance]
  );

  if (!projectEngineerId) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-muted-foreground'>No project engineer ID found.</p>
      </div>
    );
  }

  return (
    <DataTable<ProjectEngineer>
      query={engineersQuery}
      controls={controls}
      filterFields={filterFields}
      columns={columns}
      searchPlaceholder='Search by supervisor name...'
      emptyState={{
        itemType: 'engineer',
      }}
      loadingMessage='Loading engineers...'
      errorState={
        <TableErrorState
          title='Failed to load engineers'
          message={engineersQuery.error?.message || 'An error occurred'}
          onRetry={() => window.location.reload()}
        />
      }
      showFilters={false}
    />
  );
};
