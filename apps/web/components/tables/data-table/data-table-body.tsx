'use client';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/tables/table-loading';
import { DataTableControls } from './use-data-table-controls';
import { TableDraggableRow } from '../table-draggable-row';
import { UniqueIdentifier } from '@dnd-kit/core';
import { NoDataAvailable, NoSearchResults } from '@/components/no-results';
import React from 'react';
import { DataTableEmptyState } from './data-table';
import { Table, Row } from '@tanstack/react-table';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';

type WithId = {
  id?: string;
  hashId?: string | null;
  hashID?: string; // Support for hashID (capital ID) used in some APIs
};

export function DataTableBody<T extends WithId>({
  showIndexColumn,
  query,
  controls,
  table,
  dataIds,
  emptyState,
  loadingMessage,
  errorState,
  sentinelRef,
  hasMoreData = false,
  totalColumnSize = 0,
  renderExpandedRow,
  showLoaderWhenPending = true,
}: {
  showIndexColumn?: boolean;
  query: UseInfiniteQueryResult<
    InfiniteData<PaginationResponse<T>, unknown>,
    Error
  >;
  controls: DataTableControls;
  table: Table<T>;
  dataIds: UniqueIdentifier[];
  emptyState: DataTableEmptyState;
  loadingMessage?: React.ReactNode;
  errorState?: React.ReactNode;
  showLoaderWhenPending?: boolean;
  sentinelRef?: React.RefObject<HTMLTableRowElement | null>;
  hasMoreData?: boolean;
  totalColumnSize?: number;
  renderExpandedRow?: (row: Row<T>) => React.ReactNode;
}) {
  const { isLoading, error } = query;

  const hasFilters = controls.filters.length > 0 || !!controls.search;

  const handleClearFilters = React.useCallback(() => {
    controls.setSearch('');
    controls.handleFiltersChange([]);
  }, [controls]);

  const visibleLeafCount = React.useMemo(
    () => table.getVisibleLeafColumns().length + (showIndexColumn ? 1 : 0),
    [showIndexColumn, table]
  );

  const rows = table.getRowModel().rows;

  const showFullLoading = query.isPending;

  return (
    <TableBody className='**:data-[slot=table-cell]:first:w-8'>
      {showFullLoading ? (
        <TableRow>
          <TableCell colSpan={visibleLeafCount} className='p-0'>
            <TableLoadingState
              message={loadingMessage}
              showSpinner={showLoaderWhenPending}
            />
          </TableCell>
        </TableRow>
      ) : error ? (
        <TableRow>
          <TableCell colSpan={visibleLeafCount} className='p-0'>
            {errorState}
          </TableCell>
        </TableRow>
      ) : rows.length > 0 ? (
        <>
          <SortableContext
            items={dataIds}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                <TableDraggableRow<T>
                  row={row}
                  showIndexColumn={showIndexColumn}
                  totalColumnSize={totalColumnSize}
                />
                {row.getIsExpanded() && renderExpandedRow && (
                  <TableRow className='bg-muted/10 hover:bg-muted/10'>
                    <TableCell
                      colSpan={
                        table.getVisibleLeafColumns().length +
                        (showIndexColumn ? 1 : 0)
                      }
                      className='p-0'
                    >
                      {renderExpandedRow(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </SortableContext>
          {/* Loading more indicator */}
          {query.isFetchingNextPage && (
            <TableRow>
              <TableCell
                colSpan={visibleLeafCount}
                className='h-16 text-center'
              >
                <div className='flex items-center justify-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                  <span className='text-sm text-muted-foreground'>
                    Loading more...
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
          {/* Sentinel row for infinite scroll */}
          {hasMoreData && sentinelRef && !isLoading && (
            <TableRow
              ref={sentinelRef}
              className='h-px pointer-events-none'
              aria-hidden='true'
            >
              <TableCell colSpan={visibleLeafCount} className='p-0 h-px' />
            </TableRow>
          )}
        </>
      ) : (
        <TableRow>
          <TableCell colSpan={visibleLeafCount} className='h-24 text-center'>
            {hasFilters ? (
              <NoSearchResults onClearSearch={handleClearFilters} />
            ) : (
              <NoDataAvailable
                itemType={emptyState.itemType}
                onCreateNew={emptyState.onCreateNew}
              />
            )}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}
