'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckboxGridState } from '@/hooks/use-checkbox-grid';

export interface CheckboxGridRow {
  id: string;
  label: string;
}

export interface CheckboxGridColumn {
  id: string;
  label: string;
}

export interface CheckboxGridProps {
  /** Row data */
  rows: CheckboxGridRow[];
  /** Column data */
  columns: CheckboxGridColumn[];
  /** Checkbox grid state from useCheckboxGrid hook */
  gridState: CheckboxGridState;
  /** Optional: Check if a cell exists (for sparse grids). If not provided, all cells exist. */
  cellExists?: (rowId: string, columnId: string) => boolean;
  /** Label for the row header column */
  rowHeaderLabel?: string;
  /** Minimum width for row header */
  rowHeaderMinWidth?: string;
  /** Minimum width for columns */
  columnMinWidth?: string;
  /** Empty state message */
  emptyMessage?: string;
}

export function CheckboxGrid({
  rows,
  columns,
  gridState,
  cellExists,
  rowHeaderLabel = 'Name',
  rowHeaderMinWidth = '200px',
  columnMinWidth = '120px',
  emptyMessage = 'No data found',
}: CheckboxGridProps) {
  // Get row IDs that have cells for a specific column (for header checkbox)
  const getRowIdsForColumn = React.useCallback(
    (columnId: string) => {
      if (!cellExists) return rows.map((r) => r.id);
      return rows.filter((r) => cellExists(r.id, columnId)).map((r) => r.id);
    },
    [rows, cellExists]
  );

  return (
    <div className='rounded-md border overflow-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className='sticky left-0 z-10 bg-background border-r'
              style={{ minWidth: rowHeaderMinWidth }}
            >
              {rowHeaderLabel}
            </TableHead>
            {columns.map((column) => (
              <CheckboxGridColumnHeader
                key={column.id}
                column={column}
                gridState={gridState}
                rowIds={getRowIdsForColumn(column.id)}
                minWidth={columnMinWidth}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className='h-24 text-center'
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='sticky left-0 z-10 bg-background border-r font-medium'>
                  {row.label}
                </TableCell>
                {columns.map((column) => (
                  <CheckboxGridCell
                    key={column.id}
                    rowId={row.id}
                    columnId={column.id}
                    gridState={gridState}
                    exists={cellExists ? cellExists(row.id, column.id) : true}
                  />
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Sub-components ---

interface CheckboxGridColumnHeaderProps {
  column: CheckboxGridColumn;
  gridState: CheckboxGridState;
  rowIds: string[];
  minWidth: string;
}

function CheckboxGridColumnHeader({
  column,
  gridState,
  rowIds,
  minWidth,
}: CheckboxGridColumnHeaderProps) {
  const headerState = gridState.getColumnHeaderState(column.id, rowIds);

  function handleCheckedChange(checked: boolean) {
    gridState.toggleColumn(column.id, checked, rowIds);
  }

  return (
    <TableHead className='text-center' style={{ minWidth }}>
      <div className='flex flex-col items-center gap-1'>
        <span className='text-xs font-medium'>{column.label}</span>
        <Checkbox
          checked={
            headerState === true
              ? true
              : headerState === 'indeterminate'
                ? ('indeterminate' as const)
                : false
          }
          aria-label={`Select all ${column.label}`}
          onCheckedChange={(checked) => handleCheckedChange(!!checked)}
          className='mb-2'
        />
      </div>
    </TableHead>
  );
}

interface CheckboxGridCellProps {
  rowId: string;
  columnId: string;
  gridState: CheckboxGridState;
  exists: boolean;
}

function CheckboxGridCell({
  rowId,
  columnId,
  gridState,
  exists,
}: CheckboxGridCellProps) {
  // Empty cell if it doesn't exist in the data
  if (!exists) {
    return <TableCell className='text-center' />;
  }

  const isChecked = gridState.isChecked(rowId, columnId);
  const isNewlyAdded = gridState.isNewlyAdded(rowId, columnId);
  const isPendingRemoval = gridState.isPendingRemoval(rowId, columnId);

  const checkboxClassName = isNewlyAdded
    ? 'border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
    : isPendingRemoval
      ? 'border-red-500'
      : '';

  function handleCheckedChange(checked: boolean) {
    gridState.toggleCell(rowId, columnId, checked);
  }

  return (
    <TableCell className='text-center'>
      <Checkbox
        checked={isChecked}
        onCheckedChange={(checked) => handleCheckedChange(!!checked)}
        className={checkboxClassName}
      />
    </TableCell>
  );
}
