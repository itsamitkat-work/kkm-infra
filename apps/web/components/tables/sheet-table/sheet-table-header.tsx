'use client';

import React from 'react';
import { flexRender, Table } from '@tanstack/react-table';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Props<T> = {
  table: Table<T>;
  enableColumnSizing: boolean;
  dense: boolean;
  enableDragAndDrop?: boolean;
};

export function SheetTableHeader<T>({
  table,
  enableColumnSizing,
  dense,
  enableDragAndDrop = false,
}: Props<T>) {
  return (
    <TableHeader className='sticky top-[0px] z-20 bg-muted'>
      <TableRow className='hover:bg-transparent'>
        {/* Drag handle header cell */}
        {enableDragAndDrop && (
          <TableHead
            className={cn(
              'w-8 text-center text-muted-foreground',
              'border-r border-border',
              dense ? 'text-xs !px-1 !py-1.5 !h-7' : 'text-sm !px-2 !py-2 !h-9'
            )}
          >
            {/* Empty header for drag handle column */}
          </TableHead>
        )}
        {table.getHeaderGroups().map((headerGroup, groupIndex) =>
          headerGroup.headers.map((header, headerIndex) => {
            const style: React.CSSProperties = {};
            if (enableColumnSizing) {
              const col = header.column.columnDef;
              const size = header.getSize();
              if (size) style.width = `${size}px`;
              if (col.minSize) style.minWidth = `${col.minSize}px`;
              if (col.maxSize) style.maxWidth = `${col.maxSize}px`;
            }

            const isFirstColumn = header.index === 0;
            const isFirstHeader = headerIndex === 0;
            const isLastHeader = headerIndex === headerGroup.headers.length - 1;

            return (
              <TableHead
                key={`header-${groupIndex}-${headerIndex}-${header.id}`}
                className={cn(
                  'text-center text-foreground whitespace-nowrap',
                  'border-r border-border last:border-r-0',
                  'transition-colors',
                  isFirstHeader && 'rounded-tl-lg',
                  isLastHeader && 'rounded-tr-lg',
                  dense
                    ? 'text-xs !px-2 !py-1.5 !h-7'
                    : 'text-sm !px-3 !py-2 !h-9',
                  isFirstColumn && 'text-muted-foreground'
                )}
                style={style}
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </TableHead>
            );
          })
        )}
      </TableRow>
    </TableHeader>
  );
}
