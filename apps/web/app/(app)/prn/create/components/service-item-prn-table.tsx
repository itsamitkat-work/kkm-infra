'use client';

import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { usePrnServiceItemsByProject } from '../hooks/use-prn-service-items-by-project';
import type { PrnServiceItemRow } from '../hooks/use-prn-service-items-by-project';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { ServiceItemPrnDrawer } from './service-item-prn-drawer';

const TABLE_ID = 'service-item-prn-by-project';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

interface ServiceItemPrnTableProps {
  projectId: string;
}

export function ServiceItemPrnTable({ projectId }: ServiceItemPrnTableProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<PrnServiceItemRow | null>(null);

  const controls = useDataTableControls(TABLE_ID, []);
  const serviceItemsQuery = usePrnServiceItemsByProject(projectId);

  const openCreateDrawer = () => {
    setEditRow(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEditDrawer = (row: PrnServiceItemRow) => {
    setEditRow(row);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const columns = useMemo<ColumnDef<PrnServiceItemRow>[]>(
    () => [
      {
        accessorKey: 'serviceItemCode',
        header: 'Code',
        cell: ({ getValue }) => (
          <div className='font-mono text-sm text-left'>
            {(getValue() as string) ?? '—'}
          </div>
        ),
      },
      {
        accessorKey: 'serviceItemName',
        header: 'Service Item',
        cell: ({ getValue }) => (
          <div
            className='text-sm text-left truncate max-w-[280px]'
            title={(getValue() as string) ?? ''}
          >
            {(getValue() as string) ?? '—'}
          </div>
        ),
      },
      {
        accessorKey: 'Quantity',
        header: () => <div className='text-right'>Quantity</div>,
        cell: ({ getValue }) => (
          <div className='text-right text-sm text-muted-foreground'>
            {formatQty((getValue() as number) ?? 0)}
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'projectItemCode',
        header: () => <div className='text-right'>Project Item Code</div>,
        cell: ({ getValue }) => (
          <div className='text-sm text-right'>
            {(getValue() as string) ?? '—'}
          </div>
        ),
      },
      {
        id: 'actions',
        size: 80,
        header: () => null,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => openEditDrawer(row.original)}
              aria-label='Edit'
            >
              <IconPencil className='size-4' />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (serviceItemsQuery.error) {
    return (
      <TableErrorState
        title='Failed to load PRN service items'
        message={serviceItemsQuery.error.message}
        onRetry={() => serviceItemsQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DataTable<PrnServiceItemRow>
        query={serviceItemsQuery}
        controls={controls}
        filterFields={[]}
        columns={columns}
        showSearch={false}
        showFilters={false}
        showFilterAddButton={false}
        showFilterClearButton={false}
        showTotalBadge={false}
        emptyState={{
          itemType: 'PRN service item',
          onCreateNew: openCreateDrawer,
        }}
        loadingMessage='Loading PRN service items...'
        actions={{
          end: (
            <Button size='sm' onClick={openCreateDrawer}>
              <IconPlus className='size-4 mr-1' />
              Add Service Item
            </Button>
          ),
        }}
      />
      <ServiceItemPrnDrawer
        projectId={projectId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialRow={drawerMode === 'edit' ? editRow : null}
      />
    </>
  );
}
