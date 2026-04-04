'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { PrnRow } from '../hooks/use-prn-query';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { ROLE_FILTER_KEY } from './prn-filters';

const DEFAULT_PRN_DETAILS_ROLE = 'Maker';

export function getPrnTableColumns(): ColumnDef<PrnRow>[] {
  return [
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
      header: () => <div className='text-start'>#</div>,
      size: 60,
      cell: ({ row }) => (
        <div className='text-start text-muted-foreground text-sm'>
          {row.index + 1}
        </div>
      ),
    },
    {
      accessorKey: 'prnCode',
      header: 'PRN Code',
      size: 140,
      cell: ({ getValue }) => (
        <div className='text-sm'>{(getValue() as string) ?? '—'}</div>
      ),
    },
  ];
}

export function getRoleFromFilters(
  filters: { field: string; values: unknown[] }[]
): string {
  const role = filters.find((f) => f.field === ROLE_FILTER_KEY)?.values?.[0] as
    | string
    | undefined;
  return role ?? DEFAULT_PRN_DETAILS_ROLE;
}
