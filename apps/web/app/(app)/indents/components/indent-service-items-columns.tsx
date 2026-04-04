'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import type { IndentServiceItemRow } from '../hooks/use-indent-service-items-query';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export function getIndentServiceItemsColumns(): ColumnDef<IndentServiceItemRow>[] {
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
      accessorKey: 'itemName',
      header: 'Item',
      size: 280,
      cell: ({ getValue }) => (
        <div className='text-sm max-w-[280px] truncate' title={(getValue() as string) ?? ''}>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'projectName',
      header: 'Project',
      size: 180,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground'>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'serviceItemQuantity',
      header: () => <div className='text-right'>Quantity</div>,
      size: 100,
      cell: ({ getValue }) => (
        <div className='text-right text-sm text-muted-foreground'>
          {formatQty((getValue() as number) ?? 0)}
        </div>
      ),
    },
    {
      accessorKey: 'indentCode',
      header: 'Indent Code',
      size: 140,
      cell: ({ getValue }) => (
        <div className='text-sm'>{(getValue() as string) ?? '—'}</div>
      ),
    },
    {
      accessorKey: 'requestedDate',
      header: 'Requested Date',
      size: 120,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground'>
          {formatDate(getValue() as string) || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'requestedBy',
      header: 'Requested By',
      size: 120,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground'>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
  ];
}
