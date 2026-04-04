'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { cn } from '@/lib/utils';
import {
  useBolBomQuery,
  type BillRow,
  TAB_TO_API_TYPE,
} from '../hooks/use-bol-bom-query';
import { getBillFilterFields, getBillDefaultFilters } from './bill-filters';
import { BillBreakdownDialog } from './bill-breakdown-dialog';

function formatCurrency(value: number): string {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const BOL_BOM_TABLE_ID = 'bol-bom';

function getColumns(
  onBreakdownClick: (row: BillRow) => void
): ColumnDef<BillRow>[] {
  return [
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
      cell: ({ row, getValue }) => (
        <button
          type='button'
          onClick={() => onBreakdownClick(row.original)}
          className='font-mono text-sm text-left cursor-pointer hover:underline focus:outline-none focus:underline text-primary'
        >
          {getValue() as string}
        </button>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 400,
      cell: ({ row, getValue }) => (
        <button
          type='button'
          onClick={() => onBreakdownClick(row.original)}
          className='text-sm leading-relaxed text-left cursor-pointer hover:underline focus:outline-none focus:underline text-primary w-full'
        >
          {getValue() as string}
        </button>
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
}

function getProjectIdAndItemType(
  filters: { field: string; values: unknown[] }[]
): { projectId: string | null; itemType: string | null } {
  const projectId = filters.find((f) => f.field === 'projectId')
    ?.values?.[0] as string | undefined;
  const itemType = filters.find((f) => f.field === 'itemType')?.values?.[0] as
    | string
    | undefined;
  return {
    projectId: projectId ?? null,
    itemType: itemType ?? null,
  };
}

interface BillTableProps {
  tab: string;
  className?: string;
}

export function BillTable({ tab, className }: BillTableProps) {
  const controls = useDataTableControls(
    BOL_BOM_TABLE_ID,
    getBillDefaultFilters()
  );
  const { projectId, itemType } = React.useMemo(
    () => getProjectIdAndItemType(controls.filters),
    [controls.filters]
  );
  const query = useBolBomQuery(projectId, tab, itemType);
  const isQueryEnabled = Boolean(projectId && itemType);
  const loadingMessage = isQueryEnabled
    ? 'Loading bill data...'
    : 'Select project and item type to view bill data.';

  const [breakdownState, setBreakdownState] = React.useState<{
    code: string;
    description: string;
  } | null>(null);
  const openBreakdown = React.useCallback((row: BillRow) => {
    setBreakdownState({ code: row.code, description: row.description });
  }, []);
  const columns = React.useMemo(
    () => getColumns(openBreakdown),
    [openBreakdown]
  );
  const apiType = TAB_TO_API_TYPE[tab] ?? 'Material';

  return (
    <div className={cn('w-full', className)}>
      <DataTable<BillRow>
        query={query}
        controls={controls}
        filterFields={getBillFilterFields()}
        columns={columns}
        showSearch={false}
        showFilters={true}
        showFilterAddButton={false}
        showFilterClearButton={false}
        emptyState={{ itemType: 'bill item' }}
        loadingMessage={loadingMessage}
        showLoaderWhenPending={isQueryEnabled}
        errorState={
          query.error ? (
            <TableErrorState
              title='Failed to load bill data'
              message={query.error.message}
              onRetry={() => query.refetch()}
            />
          ) : undefined
        }
      />
      <BillBreakdownDialog
        open={breakdownState !== null}
        onOpenChange={(open) => !open && setBreakdownState(null)}
        projectId={projectId}
        code={breakdownState?.code ?? null}
        type={apiType}
        itemType={itemType}
        description={breakdownState?.description}
      />
    </div>
  );
}
