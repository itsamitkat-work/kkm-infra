'use client';

import React from 'react';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePrnQuery, type PrnRow } from '../hooks/use-prn-query';
import {
  usePrnServiceItemsQuery,
  type PrnServiceItemRow,
} from '../hooks/use-prn-service-items-query';
import { useMyRoles } from '@/hooks/auth/use-my-roles';
import { getPrnFilterFields, getPrnDefaultFilters } from './prn-filters';
import { getPrnTableColumns, getRoleFromFilters } from './prn-table-columns';
import { getPrnServiceItemsColumns } from './prn-service-items-columns';
import { CreatePrnButton } from './create-prn-button';
import { PrnDetailsTable } from './prn-details-table';
import { useProjects } from '@/hooks/projects/use-projects';

const PRN_TABLE_ID = 'prns';

function getProjectIdFromFilters(
  filters: { field: string; values: unknown[] }[]
): string | null {
  const projectId = filters.find((f) => f.field === 'projectId')
    ?.values?.[0] as string | undefined;
  return projectId ?? null;
}

export function PrnTable({ className }: { className?: string }) {
  const myRoles = useMyRoles();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = React.useState<string>('prns');

  const defaultFilters = React.useMemo(
    () => getPrnDefaultFilters(myRoles),
    [myRoles]
  );
  const controls = useDataTableControls(PRN_TABLE_ID, defaultFilters);
  const filterFields = React.useMemo(
    () => getPrnFilterFields(myRoles),
    [myRoles]
  );

  const prnQuery = usePrnQuery(
    controls.filters,
    controls.search,
    activeTab === 'prns'
  );
  const serviceItemsQuery = usePrnServiceItemsQuery(
    controls.filters,
    controls.search,
    activeTab === 'service-items'
  );

  const projectId = getProjectIdFromFilters(controls.filters);
  const detailsRole = getRoleFromFilters(controls.filters);
  const prnColumns = React.useMemo(() => getPrnTableColumns(), []);
  const serviceItemsColumns = React.useMemo(
    () => getPrnServiceItemsColumns(),
    []
  );

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='w-fit mb-2 ms-3'>
          <TabsTrigger value='prns'>PRN Items</TabsTrigger>
          <TabsTrigger value='service-items'>Service Items PRN</TabsTrigger>
        </TabsList>
        <TabsContent value='prns' className='mt-0'>
          <DataTable<PrnRow>
            query={prnQuery}
            controls={controls}
            filterFields={filterFields}
            columns={prnColumns}
            showSearch
            showFilters
            searchPlaceholder='Search by PRN code...'
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'PRN' }}
            loadingMessage='Loading PRNs...'
            showLoaderWhenPending={false}
            renderExpandedRow={(row) => (
              <PrnDetailsTable prnCode={row.original.prnCode} />
            )}
            actions={{
              end: (
                <CreatePrnButton projectId={projectId} projects={projects} />
              ),
            }}
          />
        </TabsContent>
        <TabsContent value='service-items' className='mt-0'>
          <DataTable<PrnServiceItemRow>
            query={serviceItemsQuery}
            controls={controls}
            filterFields={filterFields}
            columns={serviceItemsColumns}
            showSearch
            showFilters
            searchPlaceholder='Search by PRN code...'
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'service item' }}
            loadingMessage='Loading service items...'
            showLoaderWhenPending={false}
            actions={{
              end: (
                <CreatePrnButton projectId={projectId} projects={projects} />
              ),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
