'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useBolBomQuery,
  type BillRow,
} from '@/app/(app)/bom&bol/hooks/use-bol-bom-query';
import { useProjectItemsInfiniteQuery } from '@/app/(app)/projects/hooks/use-project-items-query';
import { useProject } from '@/hooks/projects/use-project';
import type { ProjectItemRowType } from '@/types/project-item';
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { ItemBasicRatesTable } from './item-basic-rates-table';
import { MaterialBreakdownTable } from './material-breakdown-table';
import { ServiceItemIndentTable } from './service-item-indent-table';

function formatCurrency(value: number): string {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const TABLE_ID_MATERIAL = 'indent-create-bom-material';
const TABLE_ID_ITEMS = 'indent-create-bom-items';

const materialColumns: ColumnDef<BillRow>[] = [
  {
    id: 'expand',
    size: 40,
    header: () => null,
    cell: ({ row }) => (
      <button
        type='button'
        onClick={row.getToggleExpandedHandler()}
        className='p-1 rounded hover:bg-muted inline-flex items-center justify-center'
        aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
      >
        {row.getIsExpanded() ? (
          <IconChevronDown className='size-4 text-muted-foreground' />
        ) : (
          <IconChevronRight className='size-4 text-muted-foreground' />
        )}
      </button>
    ),
  },
  {
    id: 'srNo',
    header: () => <div className='text-start'>Sr.No.</div>,
    size: 80,
    cell: ({ row }) => (
      <div className='text-start text-muted-foreground'>{row.index + 1}</div>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Code',
    size: 100,
    cell: ({ getValue }) => (
      <div className='font-mono text-sm text-left'>{getValue() as string}</div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: 400,
    cell: ({ getValue }) => (
      <div className='text-sm leading-relaxed text-left w-full'>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: () => <div className='text-right'>Quantity</div>,
    size: 100,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {(getValue() as number).toLocaleString('en-IN', {
          maximumFractionDigits: 4,
        })}
      </div>
    ),
  },
  {
    accessorKey: 'unit',
    header: () => <div className='text-center'>Unit</div>,
    size: 80,
    cell: ({ getValue }) => (
      <div className='text-center text-muted-foreground'>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: 'rate',
    header: () => <div className='text-right'>Rate</div>,
    size: 120,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {formatCurrency((getValue() as number) ?? 0)}
      </div>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: () => <div className='text-right'>Total Amount</div>,
    size: 140,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {formatCurrency((getValue() as number) ?? 0)}
      </div>
    ),
  },
];

const itemsColumns: ColumnDef<ProjectItemRowType>[] = [
  {
    id: 'expand',
    size: 40,
    header: () => null,
    cell: ({ row }) => (
      <button
        type='button'
        onClick={row.getToggleExpandedHandler()}
        className='p-1 rounded hover:bg-muted inline-flex items-center justify-center'
        aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
      >
        {row.getIsExpanded() ? (
          <IconChevronDown className='size-4 text-muted-foreground' />
        ) : (
          <IconChevronRight className='size-4 text-muted-foreground' />
        )}
      </button>
    ),
  },
  {
    accessorKey: 'srNo',
    header: () => <div className='text-start'>Sr.No.</div>,
    size: 80,
    cell: ({ getValue }) => (
      <div className='text-start text-muted-foreground'>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Item Code',
    size: 120,
    cell: ({ getValue }) => (
      <div className='font-mono text-sm text-left'>{getValue() as string}</div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Item',
    size: 400,
    cell: ({ getValue }) => (
      <div className='text-sm leading-relaxed text-left w-full'>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: () => <div className='text-right'>Quantity</div>,
    size: 100,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {Number((getValue() as string) || 0).toLocaleString('en-IN', {
          maximumFractionDigits: 4,
        })}
      </div>
    ),
  },
  {
    accessorKey: 'unit',
    header: () => <div className='text-center'>Unit</div>,
    size: 80,
    cell: ({ getValue }) => (
      <div className='text-center text-muted-foreground'>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: 'rate',
    header: () => <div className='text-right'>Rate</div>,
    size: 120,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {formatCurrency(Number((getValue() as string) || 0))}
      </div>
    ),
  },
  {
    accessorKey: 'total',
    header: () => <div className='text-right'>Total</div>,
    size: 120,
    cell: ({ getValue }) => (
      <div className='text-right text-muted-foreground'>
        {formatCurrency(Number((getValue() as string) || 0))}
      </div>
    ),
  },
];

interface BillTableMaterialProps {
  projectId: string;
  className?: string;
}

export function BillTableMaterial({
  projectId,
  className,
}: BillTableMaterialProps) {
  const { project } = useProject(projectId);
  const materialControls = useDataTableControls(TABLE_ID_MATERIAL, []);
  const itemsControls = useDataTableControls(TABLE_ID_ITEMS, []);

  const materialQuery = useBolBomQuery(projectId, 'bom', 'GEN');
  const itemsQuery = useProjectItemsInfiniteQuery({
    projectId,
    type: 'GEN',
    enabled: !!projectId,
  });

  const materialCols = materialColumns;

  return (
    <div className={cn('w-full flex-1 min-h-0 flex flex-col', className)}>
      <Tabs defaultValue='material' className='flex flex-col flex-1 min-h-0'>
        <TabsList className='w-fit shrink-0 ml-2'>
          <TabsTrigger value='material'>Material</TabsTrigger>
          <TabsTrigger value='items'>Items</TabsTrigger>
          <TabsTrigger value='service-item'>Service Item</TabsTrigger>
        </TabsList>
        <TabsContent value='material' className='flex-1 min-h-0 mt-2'>
          <DataTable<BillRow>
            query={materialQuery}
            controls={materialControls}
            filterFields={[]}
            columns={materialCols}
            tableName={project?.name ?? ''}
            showFilters={false}
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'bill item' }}
            loadingMessage='Loading Bill of Materials...'
            showLoaderWhenPending={true}
            renderExpandedRow={(row) => (
              <MaterialBreakdownTable
                projectId={projectId}
                code={row.original.code}
                type='Material'
                itemType='GEN'
                basicRateId={row.original.basicRateHashId}
              />
            )}
            errorState={
              materialQuery.error ? (
                <TableErrorState
                  title='Failed to load bill data'
                  message={materialQuery.error.message}
                  onRetry={() => materialQuery.refetch()}
                />
              ) : undefined
            }
          />
        </TabsContent>
        <TabsContent value='items' className='flex-1 min-h-0 mt-2'>
          <DataTable<ProjectItemRowType>
            query={itemsQuery}
            controls={itemsControls}
            filterFields={[]}
            columns={itemsColumns}
            tableName={project?.name ?? ''}
            showFilters={false}
            showFilterAddButton={false}
            showFilterClearButton={false}
            emptyState={{ itemType: 'project item' }}
            loadingMessage='Loading project items...'
            showLoaderWhenPending={true}
            renderExpandedRow={(row) => (
              <ItemBasicRatesTable
                projectId={projectId}
                projectItemId={row.original.hashId ?? row.original.id ?? ''}
                type='Material'
              />
            )}
            errorState={
              itemsQuery.error ? (
                <TableErrorState
                  title='Failed to load project items'
                  message={itemsQuery.error.message}
                  onRetry={() => itemsQuery.refetch()}
                />
              ) : undefined
            }
          />
        </TabsContent>
        <TabsContent value='service-item' className='flex-1 min-h-0 mt-2'>
          <ServiceItemIndentTable projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
