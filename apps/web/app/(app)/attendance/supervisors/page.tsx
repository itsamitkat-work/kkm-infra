'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useRouter } from 'next/navigation';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { getSupervisorsColumns } from '../components/supervisors-columns';
import { useAuth } from '@/hooks/auth/use-auth';
import { type FilterFieldConfig } from '@/components/ui/filters';
import {
  SUPERVISORS_QUERY_KEY,
  useSupervisorsQuery,
} from '../hooks/use-supervisors-query';
import { Supervisor } from '../api/supervisors-api';

const filterFields: FilterFieldConfig[] = [
  {
    group: 'Filters',
    fields: [],
  },
];

export default function SupervisorsPage() {
  return (
    <div className='h-full w-full'>
      <React.Suspense fallback={<Skeleton className='h-full w-full' />}>
        <SupervisorsTable />
      </React.Suspense>
    </div>
  );
}

const SupervisorsTable = () => {
  const router = useRouter();
  const { getUser } = useAuth();
  const currentUser = getUser();
  const projectEngineerId = currentUser?.hashId ?? null;

  const controls = useDataTableControls(SUPERVISORS_QUERY_KEY);

  const { query: supervisorsQuery } = useSupervisorsQuery(projectEngineerId);

  const onClickNavigateToAttendance = React.useCallback(
    (supervisor: Supervisor) => {
      router.push(
        `/attendance?userId=${supervisor.hashId}&userName=${encodeURIComponent(supervisor.name)}`
      );
    },
    [router]
  );

  const columns = React.useMemo(
    () => getSupervisorsColumns(onClickNavigateToAttendance),
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
    <DataTable<Supervisor>
      query={supervisorsQuery}
      controls={controls}
      filterFields={filterFields}
      columns={columns}
      searchPlaceholder='Search by supervisor name...'
      emptyState={{
        itemType: 'supervisor',
      }}
      loadingMessage='Loading supervisors...'
      errorState={
        <TableErrorState
          title='Failed to load supervisors'
          message={supervisorsQuery.error?.message || 'An error occurred'}
          onRetry={() => window.location.reload()}
        />
      }
      showFilters={false}
    />
  );
};
