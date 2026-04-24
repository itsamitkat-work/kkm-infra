'use client';

import React, { useCallback, useRef } from 'react';
import { Row as TanStackRow } from '@tanstack/react-table';
import { ComposedTable } from '@/components/composed-table';
import {
  ExtendedColumnDef,
  SheetTableProps,
  parseAndValidate,
  getColumnKey,
  isRowDisabled,
} from './utils';
import { cn, getPlatformSpecificKbd } from '@/lib/utils';
import { SheetTableHeader } from './sheet-table-header';
import { ActionAddNewRow } from './action-add-new-row';
import { Filters } from './filters';
import { InfiniteTableBody } from './infinite-table-body';
import { SheetTableRow } from './sheet-table-row';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { useHotkeys } from 'react-hotkeys-hook';
import { useFormulaModeStore } from './hooks/use-formula-mode-store';

function SheetTable<
  T extends {
    id: string; // Each row should have a unique string/number ID
    headerKey?: string | null;
    subRows?: T[];
    _original?: T | null;
  },
>({
  id: tableIdProp,
  columns,
  sheetTable,
  onEdit,
  disabledColumns = [],
  disabledRows = [],
  showHeader = true,
  dense = true,

  // Additional TanStack config
  enableColumnSizing = false,
  // Filter props
  filters,
  searchConfig,
  actions,
  addNewRow,
  autoAddRowIf,
  renderRowDetail,
  groupHeaderPlacement = 'row',
  onSaveShortcut,
  emptyState,
  containerClassName,
  excludeFromCopy,
  enableFormulaMode = false,
  enableHotkey = true,
  bulkActions,
  enableDragAndDrop = false,
  isReordering = false,
}: SheetTableProps<T>) {
  const {
    filteredData,
    table,
    cellErrors,
    setCellErrors,
    isLoading,
    isFetchingNextPage,
    isPending,
  } = sheetTable;

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = React.useRef<HTMLTableElement>(null);
  const searchInputRef = useSearchShortcut();

  // Use shared formula mode store to work across different table instances
  // Use selectors to ensure component re-renders when store updates
  // Always call hooks (React rules), but only use values when formula mode is enabled
  const formulaModeStore = useFormulaModeStore((state) => state.formulaMode);
  const setFormulaModeStore = useFormulaModeStore(
    (state) => state.setFormulaMode
  );
  const clearFormulaModeStore = useFormulaModeStore(
    (state) => state.clearFormulaMode
  );

  // Only use formula mode values when enabled (stored for conditional checks)
  // Note: We always call hooks but conditionally use their values

  // Use provided table ID or generate a unique one (using ref to persist across renders)
  const tableIdRef = React.useRef<string>(
    tableIdProp ||
      `table-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const handleSaveShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (
        !tableContainerRef.current ||
        !tableContainerRef.current.contains(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      if (!onSaveShortcut) return;

      const activeElement = document.activeElement as HTMLElement;
      const rowElement = activeElement?.closest(
        'tr[data-row-id]'
      ) as HTMLTableRowElement | null;

      if (rowElement) {
        const rowId = rowElement.getAttribute('data-row-id');
        const row = table.getRowModel().flatRows.find((r) => r.id === rowId);
        if (row) {
          onSaveShortcut(row.original, row.index);
        }
      }
    },
    [onSaveShortcut, table]
  );

  useHotkeys('ctrl+s, meta+s', handleSaveShortcut, {
    enableOnFormTags: true,
  });

  /**
   * Find a TanStack row by matching rowData.id.
   */
  const findTableRow = useCallback(
    (rowData: T): TanStackRow<T> | undefined => {
      if (!rowData.id) return undefined;
      // NOTE: Because we have expansions, rowData might be in subRows.
      // We can do a quick flatten search across all rows. We use table.getRowModel().flatRows
      return table
        .getRowModel()
        .flatRows.find((r) => r.original.id === rowData.id);
    },
    [table]
  );

  /**
   * Helper function to check if values should be compared as numbers
   */

  // Handler to enter formula mode when "=" is typed
  const handleEnterFormulaMode = useCallback(
    (rowId: string) => {
      if (!enableFormulaMode) return;

      // Create a callback to update the source row (works across table instances)
      // This callback captures the current onEdit function so it can update cells in this table
      const updateSourceRow: (
        sourceRowId: string,
        sourceColumnKey: string,
        value: unknown
      ) => void = (sourceRowId, sourceColumnKey, value) => {
        if (onEdit) {
          onEdit(sourceRowId, sourceColumnKey as keyof T, value as T[keyof T]);
        }
      };

      setFormulaModeStore({
        sourceRowId: rowId,
        sourceTableId: tableIdRef.current,
        updateSourceRow,
      });
    },
    [setFormulaModeStore, onEdit, enableFormulaMode]
  );

  // Exit formula mode on ESC key
  useHotkeys(
    'escape',
    (e) => {
      if (enableFormulaMode && formulaModeStore) {
        e.preventDefault();
        clearFormulaModeStore();
      }
    },
    {
      enableOnFormTags: true,
      enabled: enableFormulaMode,
    }
  );

  // Exit formula mode when clicking outside ALL tables
  // Only clear if clicking outside any table, not just this one
  React.useEffect(() => {
    if (!enableFormulaMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Use a small timeout to let cell onClick handlers fire first
      setTimeout(() => {
        const currentFormulaMode = useFormulaModeStore.getState().formulaMode;
        if (!currentFormulaMode) return;

        const target = e.target as Node;

        // Check if click is inside any table cell
        const isInsideTableCell =
          target &&
          ((target as Element).closest?.('td') ||
            (target as Element).closest?.('th') ||
            (target as Element).closest?.('[data-cell-id]') ||
            (target as Element).closest?.('[data-row-id]'));

        // Check if click is inside any table
        const isInsideAnyTable =
          target &&
          ((target as Element).closest?.('table') || isInsideTableCell);

        // Only clear if clicking truly outside all tables
        if (!isInsideAnyTable) {
          clearFormulaModeStore();
        }
      }, 0);
    };

    if (enableFormulaMode && formulaModeStore) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [formulaModeStore, clearFormulaModeStore, enableFormulaMode]);

  const handleCellValueChange = useCallback(
    (
      nextValue: unknown,
      groupKey: string,
      rowData: T,
      colDef: ExtendedColumnDef<T>
    ) => {
      const tanStackRow = findTableRow(rowData);
      if (!tanStackRow) return;

      const rowId = tanStackRow.id;
      const rowIndex = tanStackRow.index;
      const colKey = getColumnKey(colDef);

      const isCellDisabled =
        isRowDisabled(disabledRows, groupKey, rowIndex) ||
        (typeof disabledColumns === 'function'
          ? disabledColumns(rowData).includes(colKey)
          : (disabledColumns || []).includes(colKey));

      if (isCellDisabled) {
        return;
      }

      // Check if user typed "=" to enter formula mode (only if enabled)
      if (
        enableFormulaMode &&
        typeof nextValue === 'string' &&
        nextValue === '='
      ) {
        handleEnterFormulaMode(rowId);
        // Update the cell value to show "="
        const { parsedValue, errorMessage } = parseAndValidate(
          nextValue,
          colDef
        );
        setCellErrors((prev) => {
          const groupErrors = prev[groupKey] || {};
          const rowErrors = {
            ...(groupErrors[rowId] || {}),
            [colKey]: errorMessage,
          };
          return {
            ...prev,
            [groupKey]: { ...groupErrors, [rowId]: rowErrors },
          };
        });
        if (onEdit) {
          onEdit(rowId, colKey as keyof T, parsedValue as T[keyof T]);
        }
        return;
      }

      // If in formula mode and this is the source row, exit formula mode if value changes
      if (
        enableFormulaMode &&
        formulaModeStore &&
        formulaModeStore.sourceRowId === rowId &&
        typeof nextValue === 'string' &&
        nextValue !== '='
      ) {
        clearFormulaModeStore();
      }

      const { parsedValue, errorMessage } = parseAndValidate(nextValue, colDef);

      setCellErrors((prev) => {
        const groupErrors = prev[groupKey] || {};
        const rowErrors = {
          ...(groupErrors[rowId] || {}),
          [colKey]: errorMessage,
        };
        return { ...prev, [groupKey]: { ...groupErrors, [rowId]: rowErrors } };
      });

      if (onEdit) {
        onEdit(rowId, colKey as keyof T, parsedValue as T[keyof T]);
      }
    },
    [
      disabledColumns,
      disabledRows,
      findTableRow,
      onEdit,
      setCellErrors,
      handleEnterFormulaMode,
      clearFormulaModeStore,
      formulaModeStore,
      enableFormulaMode,
    ]
  );

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLTableCellElement>,
    row: TanStackRow<T>,
    cellIndex: number
  ) => {
    const { key } = e;
    const allRows = table.getRowModel().flatRows;
    const currentRowIndex = allRows.findIndex((r) => r.id === row.id);
    const columnCount = row.getVisibleCells().length;
    let nextRowIndex = currentRowIndex;
    let nextCellIndex = cellIndex;
    let navigated = false;
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isButton = target.tagName === 'BUTTON';
    const inputTarget = target as HTMLInputElement | HTMLTextAreaElement;

    const navigate = () => {
      const nextRow = allRows[nextRowIndex];
      const nextCell = nextRow?.getVisibleCells()[nextCellIndex];
      if (nextCell) {
        const nextCellEl = tableBodyRef.current?.querySelector(
          `[data-row-id="${nextRow.id}"] [data-cell-id="${nextCell.id}"] input, [data-row-id="${nextRow.id}"] [data-cell-id="${nextCell.id}"] textarea, [data-row-id="${nextRow.id}"] [data-cell-id="${nextCell.id}"] button`
        ) as HTMLElement;
        if (nextCellEl) {
          nextCellEl.focus();
          if (
            nextCellEl instanceof HTMLInputElement ||
            nextCellEl instanceof HTMLTextAreaElement
          ) {
            nextCellEl.select();
          }
        }
      }
    };

    if (key === 'ArrowUp' && currentRowIndex > 0) {
      e.preventDefault();
      nextRowIndex = currentRowIndex - 1;
      navigated = true;
    } else if (key === 'ArrowDown' && currentRowIndex < allRows.length - 1) {
      e.preventDefault();
      nextRowIndex = currentRowIndex + 1;
      navigated = true;
    } else if (
      key === 'ArrowLeft' &&
      (!isInput || inputTarget.selectionStart === 0) &&
      cellIndex > 0
    ) {
      e.preventDefault();
      nextCellIndex = cellIndex - 1;
      navigated = true;
    } else if (
      key === 'ArrowRight' &&
      (!isInput || inputTarget.selectionStart === inputTarget.value.length) &&
      cellIndex < columnCount - 1
    ) {
      e.preventDefault();
      nextCellIndex = cellIndex + 1;
      navigated = true;
    } else if (key === 'Enter' && !e.shiftKey) {
      if (isButton) return; // Allow default "click"
      e.preventDefault();
      nextRowIndex = Math.min(allRows.length - 1, currentRowIndex + 1);
      navigated = true;
    }

    if (navigated) {
      navigate();
    }
  };

  /**
   * Group data by `headerKey` (top-level only).
   * Sub-rows are handled by TanStack expansions.
   * When groupHeaderPlacement is "outside", we ensure all segments are included
   * even if they have no rows, so they can be displayed with empty rows.
   */
  const groupedData = React.useMemo(() => {
    const out: Record<string, T[]> = {};
    filteredData.forEach((row) => {
      const key = row.headerKey || 'ungrouped';
      if (!out[key]) out[key] = [];
      out[key].push(row);
    });

    // When using outside group headers, ensure all segments are in groupedData
    // This allows empty segments to be displayed
    if (groupHeaderPlacement === 'outside') {
      // Extract all unique headerKeys from the data
      const allHeaderKeys = new Set<string>();
      filteredData.forEach((row) => {
        if (row.headerKey) {
          allHeaderKeys.add(row.headerKey);
        }
      });

      // Ensure all headerKeys have an entry (even if empty array)
      allHeaderKeys.forEach((key) => {
        if (!out[key]) {
          out[key] = [];
        }
      });
    }

    return out;
  }, [filteredData, groupHeaderPlacement]);

  React.useEffect(() => {
    if (!addNewRow || !autoAddRowIf) {
      return;
    }

    if (
      autoAddRowIf({
        data: sheetTable.data,
        table,
      })
    ) {
      addNewRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTable.data]);

  return (
    <div className='space-y-4 p-4' ref={tableContainerRef}>
      <Filters
        searchInputRef={searchInputRef}
        searchConfig={{
          ...searchConfig,
          kbd: enableHotkey ? getPlatformSpecificKbd('K') : undefined,
        }}
        filters={filters}
        actions={actions}
        sheetTable={sheetTable}
      />

      {bulkActions && <div className='-mt-2'>{bulkActions}</div>}

      <div className='rounded-lg border overflow-hidden'>
        <ComposedTable
          className={cn(dense && 'dense')}
          containerClassName={
            containerClassName || 'max-h-[65vh] overflow-y-auto'
          }
          ref={tableBodyRef as React.Ref<HTMLTableElement>}
        >
          {showHeader && (
            <SheetTableHeader<T>
              table={table}
              enableColumnSizing={enableColumnSizing}
              dense={dense}
              enableDragAndDrop={enableDragAndDrop}
            />
          )}

          {groupHeaderPlacement === 'outside' ? (
            // Render grouped rows when groupHeaderPlacement is "outside"
            <InfiniteTableBody
              table={table}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={!!(isLoading || isPending)}
              emptyState={emptyState}
              renderRow={(row) => {
                // Find which group this row belongs to
                const groupKey = row.original.headerKey || 'ungrouped';
                return (
                  <SheetTableRow
                    key={row.id}
                    row={row}
                    groupKey={groupKey}
                    level={0}
                    {...{
                      disabledRows,
                      disabledColumns,
                      cellErrors,
                      enableColumnSizing,
                      dense,
                      handleCellValueChange,
                      handleCellKeyDown,
                      renderRowDetail,
                      columns,
                      table,
                      onEdit,
                      setCellErrors,
                      tableId: tableIdRef.current,
                      excludeFromCopy,
                      enableFormulaMode,
                      enableDragAndDrop,
                      isReordering,
                    }}
                  />
                );
              }}
              renderFooter={undefined}
              renderGroupHeader={(groupKey) =>
                groupKey !== 'ungrouped' ? (
                  <tr key={`header-${groupKey}`} data-segment-header={groupKey}>
                    <td
                      colSpan={columns.length + (enableDragAndDrop ? 1 : 0)}
                      className='font-bold text-sm opacity-80 bg-muted/50 px-4 py-2'
                    >
                      {groupKey}
                    </td>
                  </tr>
                ) : null
              }
              groupedData={groupedData}
            />
          ) : (
            // Render flat rows when groupHeaderPlacement is "row" or default
            <InfiniteTableBody
              table={table}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={!!(isLoading || isPending)}
              emptyState={emptyState}
              renderRow={(row) => (
                <SheetTableRow
                  key={row.id}
                  row={row}
                  groupKey='ungrouped'
                  level={0}
                  {...{
                    disabledRows,
                    disabledColumns,
                    cellErrors,
                    enableColumnSizing,
                    dense,
                    handleCellValueChange,
                    handleCellKeyDown,
                    renderRowDetail,
                    columns,
                    table,
                    onEdit,
                    setCellErrors,
                    tableId: tableIdRef.current,
                    excludeFromCopy,
                    enableFormulaMode,
                    enableDragAndDrop,
                    isReordering,
                  }}
                />
              )}
              renderFooter={() => (
                <ActionAddNewRow
                  onAddNewRow={addNewRow}
                  colSpan={columns.length + (enableDragAndDrop ? 1 : 0)}
                  dense={dense}
                />
              )}
            />
          )}
        </ComposedTable>
      </div>
    </div>
  );
}

export default SheetTable;
