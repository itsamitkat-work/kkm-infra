'use client';

import { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

const DEFAULT_SIZE = 50;

export type IndexColumnOptions = {
  align?: 'left' | 'center';
  size?: number;
};

export function createIndexColumn<T>(
  options: IndexColumnOptions = {}
): ColumnDef<T> {
  const { align = 'left', size = DEFAULT_SIZE } = options;
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  return {
    accessorKey: 'index',
    header: () => (
      <div className={cn(alignClass, 'text-muted-foreground')}>#</div>
    ),
    size,
    minSize: size,
    maxSize: size,
    cell: ({ row }) => (
      <span className={cn(alignClass, 'text-muted-foreground')}>
        {row.index + 1}
      </span>
    ),
  };
}
