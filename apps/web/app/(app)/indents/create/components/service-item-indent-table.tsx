'use client';

import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { TableErrorState } from '@/components/tables/table-error';
import { useIndentServiceItemsByProject } from '../hooks/use-indent-service-items-by-project';
import type { IndentServiceItemRow } from '../hooks/use-indent-service-items-by-project';
import { ServiceItemIndentDrawer } from './service-item-indent-drawer';
import { IconPencil, IconPlus } from '@tabler/icons-react';

const TABLE_ID = 'service-item-indent-by-project';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

interface ServiceItemIndentTableProps {
  projectId: string;
}

export function ServiceItemIndentTable({
  projectId,
}: ServiceItemIndentTableProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<IndentServiceItemRow | null>(null);

  const controls = useDataTableControls(TABLE_ID, []);
  const serviceItemsQuery = useIndentServiceItemsByProject(projectId);

  const openCreateDrawer = () => {
    setEditRow(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEditDrawer = (row: IndentServiceItemRow) => {
    setEditRow(row);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const columns = useMemo<ColumnDef<IndentServiceItemRow>[]>(
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
        accessorKey: 'itemName',
        header: 'Item',
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
        accessorKey: 'serviceItemQuantity',
        header: () => <div className='text-right'>Quantity</div>,
        cell: ({ getValue }) => (
          <div className='text-right text-sm text-muted-foreground'>
            {formatQty((getValue() as number) ?? 0)}
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'indentCode',
        header: () => <div className='text-right'>Indent Code</div>,
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
        title='Failed to load service item indents'
        message={serviceItemsQuery.error.message}
        onRetry={() => serviceItemsQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DataTable<IndentServiceItemRow>
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
          itemType: 'service item indent',
          onCreateNew: openCreateDrawer,
        }}
        loadingMessage='Loading service item indents...'
        actions={{
          end: (
            <Button size='sm' onClick={openCreateDrawer}>
              <IconPlus className='size-4 mr-1' />
              Add Service Item
            </Button>
          ),
        }}
      />
      <ServiceItemIndentDrawer
        projectId={projectId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialRow={drawerMode === 'edit' ? editRow : null}
      />
    </>
  );
}
