import React from 'react';
import { TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Row, Table } from '@tanstack/react-table';
import { TableLoadingState } from '../table-loading';

interface InfiniteTableBodyProps<T extends { id: string }> {
  table: Table<T>;
  isFetchingNextPage?: boolean;
  isLoading: boolean;
  emptyState?: React.ReactNode;
  renderRow: (row: Row<T>) => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  errorState?: React.ReactNode;
  renderGroupHeader?: (groupKey: string) => React.ReactNode;
  groupedData?: Record<string, T[]>;
}

export function InfiniteTableBody<T extends { id: string }>({
  table,
  isFetchingNextPage,
  isLoading,
  emptyState,
  renderRow,
  renderFooter,

  renderGroupHeader,
  groupedData,
}: InfiniteTableBodyProps<T>) {
  const { rows } = table.getRowModel();

  // Check if we have any actual data (not just empty/new rows)
  // Use type assertion to check for optional properties that may exist on some row types
  const hasActualData = rows.some((row) => {
    const original = row.original as Record<string, unknown>;
    return !original.is_new || original.id;
  });

  if (isLoading && !hasActualData) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={table.getAllColumns().length}>
            <TableLoadingState />
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className='h-24 text-center'
          >
            {emptyState || 'No results found.'}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  // If groupedData is provided, render grouped rows
  if (groupedData && renderGroupHeader) {
    // Get all segment keys (excluding ungrouped) - this ensures all segments are shown
    const segmentOrder = Object.keys(groupedData).filter(
      (key) => key !== 'ungrouped'
    );
    const ungroupedRows = groupedData['ungrouped'] || [];

    return (
      <TableBody>
        {segmentOrder.map((groupKey) => {
          const groupRows = groupedData[groupKey] || [];
          // Always render the group header even if there are no rows
          // This ensures all segments are visible

          // Find corresponding TanStack rows for this group
          const tanStackRows = rows.filter((row) =>
            groupRows.some((groupRow) => groupRow.id === row.original.id)
          );

          return (
            <React.Fragment key={groupKey}>
              {renderGroupHeader(groupKey)}
              {tanStackRows.map((row) => {
                if (!row) return null;
                return renderRow(row);
              })}
            </React.Fragment>
          );
        })}
        {/* Render ungrouped rows at the end */}
        {ungroupedRows.length > 0 &&
          rows
            .filter((row) =>
              ungroupedRows.some((groupRow) => groupRow.id === row.original.id)
            )
            .map((row) => {
              if (!row) return null;
              return renderRow(row);
            })}

        {isFetchingNextPage && (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className='text-center'
            >
              <TableLoadingState message='Loading more items...' />
            </TableCell>
          </TableRow>
        )}
        {renderFooter && renderFooter()}
      </TableBody>
    );
  }

  // Default flat rendering
  return (
    <TableBody>
      {rows.map((row) => {
        if (!row) return null;
        return renderRow(row);
      })}

      {isFetchingNextPage && (
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className='text-center'
          >
            <TableLoadingState message='Loading more items...' />
          </TableCell>
        </TableRow>
      )}
      {renderFooter && renderFooter()}
    </TableBody>
  );
}
