'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { PrnServiceItemRow } from '../hooks/use-prn-service-items-query';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export function getPrnServiceItemsColumns(): ColumnDef<PrnServiceItemRow>[] {
  return [
    {
      id: 'srNo',
      header: () => <div className='text-start'>#</div>,
      size: 60,
      cell: ({ row }) => (
        <div className='text-start text-muted-foreground text-sm'>
          {row.index + 1}
        </div>
      ),
    },
    {
      accessorKey: 'serviceItemCode',
      header: 'Service Item Code',
      size: 120,
      cell: ({ getValue }) => (
        <div className='text-sm font-mono'>{(getValue() as string) ?? '—'}</div>
      ),
    },
    {
      accessorKey: 'serviceItemName',
      header: 'Service Item',
      size: 280,
      cell: ({ getValue }) => (
        <div className='text-sm max-w-[280px] truncate' title={(getValue() as string) ?? ''}>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'projectItemCode',
      header: 'Project Item Code',
      size: 140,
      cell: ({ getValue }) => (
        <div className='text-sm font-mono'>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'projectItemName',
      header: 'Project Item',
      size: 200,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground max-w-[200px] truncate' title={(getValue() as string) ?? ''}>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'Quantity',
      header: () => <div className='text-right'>Quantity</div>,
      size: 100,
      cell: ({ getValue }) => (
        <div className='text-right text-sm text-muted-foreground'>
          {formatQty((getValue() as number) ?? 0)}
        </div>
      ),
    },
  ];
}
