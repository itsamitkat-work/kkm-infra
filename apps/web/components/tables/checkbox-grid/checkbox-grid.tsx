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
  /** When true, all checkboxes are disabled (e.g. read-only drawer). */
  readOnly?: boolean;
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
  readOnly = false,
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
      <Table className='w-full table-fixed'>
        <TableHeader>
          <TableRow>
            <TableHead
              className='sticky left-0 z-10 bg-background border-r'
              style={{
                minWidth: rowHeaderMinWidth,
                width: rowHeaderMinWidth,
              }}
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
                readOnly={readOnly}
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
                <TableCell
                  className='sticky left-0 z-10 bg-background border-r font-medium'
                  style={{ minWidth: rowHeaderMinWidth, width: rowHeaderMinWidth }}
                >
                  {row.label}
                </TableCell>
                {columns.map((column) => (
                  <CheckboxGridCell
                    key={column.id}
                    rowId={row.id}
                    columnId={column.id}
                    gridState={gridState}
                    exists={cellExists ? cellExists(row.id, column.id) : true}
                    readOnly={readOnly}
                    columnWidth={columnMinWidth}
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
  readOnly: boolean;
}

function CheckboxGridColumnHeader({
  column,
  gridState,
  rowIds,
  minWidth,
  readOnly,
}: CheckboxGridColumnHeaderProps) {
  const headerState = gridState.getColumnHeaderState(column.id, rowIds);

  function handleCheckedChange(checked: boolean) {
    gridState.toggleColumn(column.id, checked, rowIds);
  }

  return (
    <TableHead
      className='h-auto min-h-10 py-2 text-center align-middle !px-2'
      style={{ minWidth, width: minWidth }}
    >
      <div className='flex w-full flex-col items-center justify-center gap-1.5'>
        <span className='text-xs font-medium leading-none'>
          {column.label}
        </span>
        <div className='flex w-full shrink-0 justify-center'>
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
            disabled={readOnly}
          />
        </div>
      </div>
    </TableHead>
  );
}

interface CheckboxGridCellProps {
  rowId: string;
  columnId: string;
  gridState: CheckboxGridState;
  exists: boolean;
  readOnly: boolean;
  columnWidth: string;
}

function CheckboxGridCell({
  rowId,
  columnId,
  gridState,
  exists,
  readOnly,
  columnWidth,
}: CheckboxGridCellProps) {
  const cellStyle: React.CSSProperties = {
    minWidth: columnWidth,
    width: columnWidth,
  };

  // Empty cell if it doesn't exist in the data
  if (!exists) {
    return (
      <TableCell className='p-2 align-middle' style={cellStyle} />
    );
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
    <TableCell className='p-2 align-middle !px-2' style={cellStyle}>
      <div className='flex w-full justify-center'>
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => handleCheckedChange(!!checked)}
          className={checkboxClassName}
          disabled={readOnly}
        />
      </div>
    </TableCell>
  );
}
