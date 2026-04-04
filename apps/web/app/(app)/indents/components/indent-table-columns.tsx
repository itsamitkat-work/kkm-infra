'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import type { IndentRow } from '../hooks/use-indent-query';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { ROLE_FILTER_KEY } from './indent-filters';

const DEFAULT_INDENT_DETAILS_ROLE = 'Maker';

export function getIndentTableColumns(): ColumnDef<IndentRow>[] {
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
      accessorKey: 'projectName',
      header: 'Project',
      size: 200,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground'>
          {(getValue() as string) ?? '—'}
        </div>
      ),
    },
    {
      accessorKey: 'requestedBy',
      header: 'Requested By',
      size: 140,
      cell: ({ getValue }) => (
        <div className='text-sm text-muted-foreground'>
          {(getValue() as string) ?? '—'}
        </div>
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
  return role ?? DEFAULT_INDENT_DETAILS_ROLE;
}
