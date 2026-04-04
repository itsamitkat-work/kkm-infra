'use client';

import React from 'react';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useIndentQuery, type IndentRow } from '../hooks/use-indent-query';
import {
  useIndentServiceItemsQuery,
  type IndentServiceItemRow,
} from '../hooks/use-indent-service-items-query';
import { useMyRoles } from '@/hooks/auth/use-my-roles';
import {
  getIndentFilterFields,
  getIndentDefaultFilters,
} from './indent-filters';
import {
  getIndentTableColumns,
  getRoleFromFilters,
} from './indent-table-columns';
import { getIndentServiceItemsColumns } from './indent-service-items-columns';
import { CreateIndentButton } from './create-indent-button';
import { IndentDetailsTable } from './indent-details-table';
import { useProjects } from '@/hooks/projects/use-projects';

const INDENT_TABLE_ID = 'indents';

function getProjectIdFromFilters(
  filters: { field: string; values: unknown[] }[]
): string | null {
  const projectId = filters.find((f) => f.field === 'projectId')
    ?.values?.[0] as string | undefined;
  return projectId ?? null;
}

export function IndentTable({ className }: { className?: string }) {
  const myRoles = useMyRoles();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = React.useState<string>('indents');

  const defaultFilters = React.useMemo(
    () => getIndentDefaultFilters(myRoles),
    [myRoles]
  );
  const controls = useDataTableControls(INDENT_TABLE_ID, defaultFilters);
  const filterFields = React.useMemo(
    () => getIndentFilterFields(myRoles),
    [myRoles]
  );

  const indentQuery = useIndentQuery(
    controls.filters,
    controls.search,
    activeTab === 'indents'
  );
  const serviceItemsQuery = useIndentServiceItemsQuery(
    controls.filters,
    controls.search,
    activeTab === 'service-items'
  );

  const projectId = getProjectIdFromFilters(controls.filters);
  const detailsRole = getRoleFromFilters(controls.filters);
  const indentColumns = React.useMemo(() => getIndentTableColumns(), []);
  const serviceItemsColumns = React.useMemo(
    () => getIndentServiceItemsColumns(),
    []
  );

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='w-fit mb-2 ms-3'>
          <TabsTrigger value='indents'>Items Indents</TabsTrigger>
          <TabsTrigger value='service-items'>Service Items Indents</TabsTrigger>
        </TabsList>
        <TabsContent value='indents' className='mt-0'>
          <DataTable<IndentRow>
            query={indentQuery}
            controls={controls}
            filterFields={filterFields}
            columns={indentColumns}
            showSearch
            showFilters
            searchPlaceholder='Search by indent code...'
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'indent' }}
            loadingMessage='Loading indents...'
            showLoaderWhenPending={false}
            renderExpandedRow={(row) => (
              <IndentDetailsTable
                indentCode={row.original.indentCode}
                role={detailsRole}
              />
            )}
            actions={{
              end: (
                <CreateIndentButton projectId={projectId} projects={projects} />
              ),
            }}
          />
        </TabsContent>
        <TabsContent value='service-items' className='mt-0'>
          <DataTable<IndentServiceItemRow>
            query={serviceItemsQuery}
            controls={controls}
            filterFields={filterFields}
            columns={serviceItemsColumns}
            showSearch
            showFilters
            searchPlaceholder='Search by indent code...'
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'service item' }}
            loadingMessage='Loading service items...'
            showLoaderWhenPending={false}
            actions={{
              end: (
                <CreateIndentButton projectId={projectId} projects={projects} />
              ),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
