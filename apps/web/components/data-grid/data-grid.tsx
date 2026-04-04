'use client';

import { Plus } from 'lucide-react';
import * as React from 'react';
import { DataGridColumnHeader } from '@/components/data-grid/data-grid-column-header';
import { DataGridContextMenu } from '@/components/data-grid/data-grid-context-menu';
import { DataGridPasteDialog } from '@/components/data-grid/data-grid-paste-dialog';
import { DataGridRow } from '@/components/data-grid/data-grid-row';
import { DataGridSearch } from '@/components/data-grid/data-grid-search';
import { useAsRef } from '@/hooks/use-as-ref';
import type { useDataGrid } from '@/hooks/use-data-grid';
import {
  flexRender,
  getColumnBorderVisibility,
  getColumnPinningStyle,
} from '@/lib/data-grid';
import { cn } from '@/lib/utils';
import type { Direction } from '@/types/data-grid';

const EMPTY_CELL_SELECTION_SET = new Set<string>();

interface DataGridProps<TData>
  extends
    Omit<ReturnType<typeof useDataGrid<TData>>, 'dir'>,
    Omit<React.ComponentProps<'div'>, 'contextMenu'> {
  dir?: Direction;
  height?: number;
  stretchColumns?: boolean;
  /** Optional content rendered inside the grid footer (below Add row when present) */
  footer?: React.ReactNode;
  /** Optional content rendered on the right side of the Add row (when onRowAdd is set) */
  footerRowTrailing?: React.ReactNode;
  /** Optional className for the inner grid element (e.g. border-0 rounded-none when embedded in a card) */
  gridClassName?: string;
}

export function DataGrid<TData>({
  dataGridRef,
  headerRef,
  rowMapRef,
  footerRef,
  dir = 'ltr',
  table,
  tableMeta,
  virtualTotalSize,
  virtualItems,
  measureElement,
  columns,
  columnSizeVars,
  searchState,
  searchMatchesByRow,
  activeSearchMatch,
  cellSelectionMap,
  focusedCell,
  editingCell,
  rowHeight,
  contextMenu,
  pasteDialog,
  onRowAdd: onRowAddProp,
  height = 600,
  stretchColumns = false,
  adjustLayout = false,
  className,
  footer,
  footerRowTrailing,
  gridClassName,
  ...props
}: DataGridProps<TData>) {
  const rows = table.getRowModel().rows;
  const readOnly = tableMeta?.readOnly ?? false;
  const columnVisibility = table.getState().columnVisibility;
  const columnPinning = table.getState().columnPinning;

  const onRowAddRef = useAsRef(onRowAddProp);

  const onRowAdd = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      onRowAddRef.current?.(event);
    },
    [onRowAddRef]
  );

  const onDataGridContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  const onFooterCellKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onRowAddRef.current) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowAddRef.current();
      }
    },
    [onRowAddRef]
  );

  return (
    <div
      data-slot='grid-wrapper'
      dir={dir}
      {...props}
      className={cn('relative flex w-full flex-col', className)}
    >
      {searchState && <DataGridSearch {...searchState} />}
      <DataGridContextMenu
        tableMeta={tableMeta}
        columns={columns}
        contextMenu={contextMenu}
      />
      <DataGridPasteDialog tableMeta={tableMeta} pasteDialog={pasteDialog} />
      <div
        role='grid'
        aria-label='Data grid'
        aria-rowcount={rows.length + (onRowAddProp ? 1 : 0)}
        aria-colcount={columns.length}
        data-slot='grid'
        tabIndex={0}
        ref={dataGridRef}
        className={cn(
          'relative grid select-none overflow-auto rounded-md border focus:outline-none',
          gridClassName
        )}
        style={{
          ...columnSizeVars,
          maxHeight: `${height}px`,
        }}
        onContextMenu={onDataGridContextMenu}
      >
        <div
          role='rowgroup'
          data-slot='grid-header'
          ref={headerRef}
          className='sticky top-0 z-10 grid border-b bg-background'
        >
          {table.getHeaderGroups().map((headerGroup, rowIndex) => (
            <div
              key={headerGroup.id}
              role='row'
              aria-rowindex={rowIndex + 1}
              data-slot='grid-header-row'
              tabIndex={-1}
              className='flex w-full'
            >
              {headerGroup.headers.map((header, colIndex) => {
                const sorting = table.getState().sorting;
                const currentSort = sorting.find(
                  (sort) => sort.id === header.column.id
                );
                const isSortable = header.column.getCanSort();

                const nextHeader = headerGroup.headers[colIndex + 1];
                const isLastColumn =
                  colIndex === headerGroup.headers.length - 1;

                const { showEndBorder, showStartBorder } =
                  getColumnBorderVisibility({
                    column: header.column,
                    nextColumn: nextHeader?.column,
                    isLastColumn,
                  });

                return (
                  <div
                    key={header.id}
                    role='columnheader'
                    aria-colindex={colIndex + 1}
                    aria-sort={
                      currentSort?.desc === false
                        ? 'ascending'
                        : currentSort?.desc === true
                          ? 'descending'
                          : isSortable
                            ? 'none'
                            : undefined
                    }
                    data-slot='grid-header-cell'
                    tabIndex={-1}
                    className={cn('relative', {
                      grow:
                        (stretchColumns && header.column.id !== 'select') ||
                        header.column.columnDef.meta?.flex === true,
                      'border-e':
                        showEndBorder && header.column.id !== 'select',
                      'border-s':
                        showStartBorder && header.column.id !== 'select',
                    })}
                    style={{
                      ...getColumnPinningStyle({ column: header.column, dir }),
                      ...(header.column.columnDef.meta?.flex === true
                        ? {
                            minWidth: `calc(var(--header-${header.id}-size) * 1px)`,
                            flex: '1 1 0%',
                          }
                        : {
                            width: `calc(var(--header-${header.id}-size) * 1px)`,
                          }),
                    }}
                  >
                    {header.isPlaceholder ? null : typeof header.column
                        .columnDef.header === 'function' ? (
                      <div
                        className={cn(
                          'size-full',
                          rowHeight === 'compact'
                            ? 'px-1.5 py-0.5'
                            : 'px-3 py-1.5'
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    ) : (
                      <DataGridColumnHeader header={header} table={table} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div
          role='rowgroup'
          data-slot='grid-body'
          className='relative grid'
          style={{
            height: `${virtualTotalSize}px`,
            contain: adjustLayout ? 'layout paint' : 'strict',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const row = rows[virtualItem.index];
            if (!row) return null;

            const cellSelectionKeys =
              cellSelectionMap?.get(virtualItem.index) ??
              EMPTY_CELL_SELECTION_SET;

            const searchMatchColumns =
              searchMatchesByRow?.get(virtualItem.index) ?? null;
            const isActiveSearchRow =
              activeSearchMatch?.rowIndex === virtualItem.index;

            return (
              <DataGridRow
                key={row.id}
                row={row}
                tableMeta={tableMeta}
                rowMapRef={rowMapRef}
                virtualItem={virtualItem}
                measureElement={measureElement}
                rowHeight={rowHeight}
                columnVisibility={columnVisibility}
                columnPinning={columnPinning}
                focusedCell={focusedCell}
                editingCell={editingCell}
                cellSelectionKeys={cellSelectionKeys}
                searchMatchColumns={searchMatchColumns}
                activeSearchMatch={isActiveSearchRow ? activeSearchMatch : null}
                dir={dir}
                adjustLayout={adjustLayout}
                stretchColumns={stretchColumns}
                readOnly={readOnly}
              />
            );
          })}
        </div>
        {(!readOnly && onRowAdd) || footer ? (
          <div
            role='rowgroup'
            data-slot='grid-footer'
            ref={footerRef}
            className='sticky bottom-0 z-10 grid w-full border-t bg-background'
          >
            {!readOnly && onRowAdd && (
              <div
                role='row'
                aria-rowindex={rows.length + 2}
                data-slot='grid-add-row'
                tabIndex={-1}
                className='flex w-full'
              >
                <div
                  role='gridcell'
                  tabIndex={0}
                  className='relative flex h-9 w-full items-center justify-between bg-muted/30 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none'
                  style={{
                    width: table.getTotalSize(),
                    minWidth: table.getTotalSize(),
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-slot="grid-footer-row-trailing"]'))
                      return;
                    onRowAdd(e);
                  }}
                  onKeyDown={onFooterCellKeyDown}
                >
                  <div className='flex shrink-0 items-center gap-2 px-3 text-muted-foreground'>
                    <Plus className='size-3.5' />
                    <span className='text-sm'>Add row</span>
                  </div>
                  {footerRowTrailing ? (
                    <div
                      data-slot='grid-footer-row-trailing'
                      className='flex shrink-0 items-center pr-3'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {footerRowTrailing}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            {footer ? (
              <div
                data-slot='grid-footer-content'
                className='flex w-full border-t border-border/50 bg-background px-4 py-3'
              >
                {footer}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
