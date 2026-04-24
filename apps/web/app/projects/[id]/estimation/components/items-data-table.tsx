'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComposedTable } from '@/components/composed-table';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
  // For styling specific columns like in the original code
  getColumnBackground?: (columnId: string) => string;
  defaultExpandAll?: boolean;
  fluidColumnId?: string;
}

export function ItemsDataTable<TData, TValue>({
  columns,
  data,
  renderSubComponent,
  getRowId,
  isLoading,
  isError,
  className,
  getColumnBackground,
  defaultExpandAll = false,
  fluidColumnId,
}: Props<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Handle expand all changes
  React.useEffect(() => {
    table.toggleAllRowsExpanded(defaultExpandAll);
  }, [defaultExpandAll, table]);

  if (isLoading) {
    return (
      <div className='p-8 text-center text-muted-foreground'>
        <div className='flex items-center justify-center'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span className='ml-2'>Loading data...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='p-8 text-center text-destructive'>
        Error loading data. Please try again.
      </div>
    );
  }

  if (!isLoading && !isError && data.length === 0) {
    return (
      <div className='p-8 text-center text-muted-foreground'>
        No items match your search.
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border relative', className)}>
      <ComposedTable containerClassName='overflow-visible'>
        <TableHeader className='sticky top-0 z-20 bg-background'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const bgColor = getColumnBackground?.(header.id) || '';
                const isFluid = header.column.id === fluidColumnId;

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: isFluid ? 'auto' : header.getSize() }}
                    className={cn(
                      'border-r last:border-r-0 text-center transition-colors pr-0',
                      bgColor,
                      isFluid && 'w-full min-w-[200px]' // Force fluid column to take available space
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isExpanded = row.getIsExpanded();
            let rowClassName = 'transition-colors hover:bg-muted/50';

            if (isExpanded) {
              rowClassName += ' border-b-0';
            }

            return (
              <React.Fragment key={row.id}>
                {/* Visual separator for expanded rows */}
                {isExpanded && row.index > 0 && (
                  <TableRow className='h-2 bg-muted/20 border-none hover:bg-muted/20'>
                    <TableCell
                      colSpan={row.getVisibleCells().length}
                      className='p-0'
                    />
                  </TableRow>
                )}

                <TableRow
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(rowClassName, isExpanded ? 'bg-muted/10' : '')}
                >
                  {row.getVisibleCells().map((cell) => {
                    const bgColor = getColumnBackground?.(cell.column.id) || '';
                    const isFluid = cell.column.id === fluidColumnId;

                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: isFluid ? 'auto' : cell.column.getSize(),
                        }}
                        className={cn(
                          'border-r last:border-r-0 p-2',
                          bgColor,
                          isFluid && 'w-full max-w-0 overflow-hidden'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {isExpanded && renderSubComponent && (
                  <TableRow className='bg-muted/10 hover:bg-muted/10 border-t-0'>
                    <TableCell
                      colSpan={row.getVisibleCells().length}
                      className='p-0'
                    >
                      {renderSubComponent({ row })}
                    </TableCell>
                  </TableRow>
                )}
                {/* Visual separator below expanded rows */}
                {isExpanded && (
                  <TableRow className='h-2 bg-muted/20 border-none hover:bg-muted/20'>
                    <TableCell
                      colSpan={row.getVisibleCells().length}
                      className='p-0'
                    />
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </ComposedTable>
    </div>
  );
}
