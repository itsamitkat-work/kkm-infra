'use client';

import React, { useCallback } from 'react';
import { flexRender, Row as TanStackRow } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, GripVertical, Loader2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ExtendedColumnDef,
  SheetTableEditorProps,
  getColumnKey,
  isRowDisabled,
} from './utils';
import { cn } from '@/lib/utils';
import { CellEditor } from './cell-editor';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { RowFocusTarget } from './hooks/use-edit-sheet-table';
import { useFormulaModeStore } from './hooks/use-formula-mode-store';
import { Table } from '@tanstack/react-table';
import { parseAndValidate } from './utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SheetTableRowProps<
  T extends { id: string; _original?: T | null; focusIndex?: RowFocusTarget },
> {
  row: TanStackRow<T>;
  groupKey: string;
  level?: number;
  disabledRows: number[] | Record<string, number[]>;
  disabledColumns: string[] | ((rowData: T) => string[]);
  cellErrors: Record<string, Record<string, Record<string, string | null>>>;
  enableColumnSizing: boolean;
  dense: boolean;
  handleCellValueChange: (
    value: unknown,
    groupKey: string,
    rowData: T,
    colDef: ExtendedColumnDef<T>
  ) => void;
  handleCellKeyDown: (
    e: React.KeyboardEvent<HTMLTableCellElement>,
    row: TanStackRow<T>,
    cellIndex: number
  ) => void;
  renderRowDetail?: (row: T) => React.ReactNode;
  columns: ExtendedColumnDef<T>[];
  table: Table<T>;
  onEdit?: <K extends keyof T>(
    rowIndex: string,
    columnId: K,
    value: T[K]
  ) => void;
  setCellErrors?: (
    updater: (
      prev: Record<string, Record<string, Record<string, string | null>>>
    ) => Record<string, Record<string, Record<string, string | null>>>
  ) => void;
  tableId?: string;
  excludeFromCopy?: string[];
  enableFormulaMode?: boolean;
  enableDragAndDrop?: boolean;
  isReordering?: boolean;
}

export function SheetTableRow<
  T extends {
    id: string;
    _original?: T | null;
    subRows?: T[];
    focusIndex?: RowFocusTarget;
  },
>({
  row,
  groupKey,
  level = 0,
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
  tableId,
  excludeFromCopy,
  enableFormulaMode = false,
  enableDragAndDrop = false,
  isReordering = false,
}: SheetTableRowProps<T>) {
  // Use the store directly instead of prop drilling
  // Use selectors to ensure component re-renders when store updates
  // Always call hooks (React rules), but only use values when formula mode is enabled
  const formulaModeStore = useFormulaModeStore((state) => state.formulaMode);
  const clearFormulaModeStore = useFormulaModeStore(
    (state) => state.clearFormulaMode
  );

  // Drag and drop sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.original.id,
    disabled:
      !enableDragAndDrop ||
      (row.original as Record<string, unknown>).isNew === true,
  });

  // Only use formula mode values when enabled (stored for conditional checks)
  // Note: We always call hooks but conditionally use their values

  const rowId = row.id;
  const rowIndex = row.index;
  const rowData = row.original;
  const visibleCells = row.getVisibleCells();
  const focusConfig = rowData.focusIndex;
  const isRowNew = (rowData as Record<string, unknown>).isNew === true;
  const rowRef = React.useRef<HTMLTableRowElement>(null);

  // Scroll to row when it has focusIndex set
  React.useEffect(() => {
    if (
      isRowNew &&
      typeof focusConfig === 'number' &&
      focusConfig >= 0 &&
      rowRef.current
    ) {
      // Scroll row into view
      rowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isRowNew, focusConfig]);

  // Create handleCellReference using the store and table dependencies
  const handleCellReference = useCallback(
    (referencedRowId: string) => {
      if (!enableFormulaMode) return;

      // Always read from store directly to avoid stale closures
      const currentFormulaMode = useFormulaModeStore.getState().formulaMode;
      if (!currentFormulaMode) return;

      const { sourceRowId, sourceTableId, updateSourceRow } =
        currentFormulaMode;

      // Find the referenced row in this table instance
      const referencedRow = table
        .getRowModel()
        .flatRows.find((r) => r.id === referencedRowId);

      if (!referencedRow) {
        clearFormulaModeStore();
        return;
      }

      // Check if the source row is in this table instance
      const isSourceInThisTable = sourceTableId === tableId;
      const sourceRow = isSourceInThisTable
        ? table.getRowModel().flatRows.find((r) => r.id === sourceRowId)
        : null;

      // Always copy all column values from the referenced row to the source row
      const referencedCells = referencedRow.getVisibleCells();
      const newCellErrors: Record<string, string | null> = {};
      const copiedData: Array<{
        column: string;
        sourceValue: unknown;
        targetValue: unknown;
      }> = [];

      referencedCells.forEach((referencedCell) => {
        const colDef = referencedCell.column.columnDef as ExtendedColumnDef<T>;
        const colKey = getColumnKey(colDef);

        // Skip computed columns (they are calculated automatically)
        if (colDef.computeValue) {
          return;
        }

        // Skip if column is excluded from copying
        if (excludeFromCopy && excludeFromCopy.includes(colKey)) {
          return;
        }

        // Skip if column is disabled for the source row (only if source is in this table)
        if (sourceRow) {
          const sourceRowData = sourceRow.original;
          const sourceRowIndex = sourceRow.index;
          const isCellDisabled =
            isRowDisabled(disabledRows, groupKey, sourceRowIndex) ||
            (typeof disabledColumns === 'function'
              ? disabledColumns(sourceRowData).includes(colKey)
              : (disabledColumns || []).includes(colKey));

          if (isCellDisabled) {
            return;
          }
        }

        const referencedValue = referencedCell.getValue();
        const sourceColDef = columns.find(
          (col) => getColumnKey(col) === colKey
        );

        if (!sourceColDef) {
          return;
        }

        // Parse and validate the value
        const { parsedValue, errorMessage } = parseAndValidate(
          referencedValue,
          sourceColDef
        );

        // Store error message (only if source is in this table)
        if (errorMessage && sourceRow && setCellErrors) {
          newCellErrors[colKey] = errorMessage;
        }

        // Log the data being copied
        copiedData.push({
          column: colKey,
          sourceValue: referencedValue,
          targetValue: parsedValue,
        });

        // Update the source row with the referenced value
        // Always use updateSourceRow callback when source is in another table
        if (!isSourceInThisTable && updateSourceRow) {
          // Source is in another table - use the callback
          updateSourceRow(sourceRowId, colKey, parsedValue);
        } else if (isSourceInThisTable && onEdit) {
          // Source is in this table - use local onEdit
          onEdit(sourceRowId, colKey as keyof T, parsedValue as T[keyof T]);
        } else if (updateSourceRow) {
          // Fallback to callback if onEdit is not available
          updateSourceRow(sourceRowId, colKey, parsedValue);
        }
      });

      // Log the data copy summary
      console.log('[Formula Mode] Data copied from source row to target row:', {
        sourceTableId: sourceTableId || 'unknown',
        targetTableId: tableId || 'unknown',
        sourceRowId,
        referencedRowId,
        copiedData,
      });

      // Update all cell errors at once (only if source is in this table)
      if (Object.keys(newCellErrors).length > 0 && setCellErrors && sourceRow) {
        setCellErrors((prev) => {
          const groupErrors = prev[groupKey] || {};
          const rowErrors = {
            ...(groupErrors[sourceRowId] || {}),
            ...newCellErrors,
          };
          return {
            ...prev,
            [groupKey]: { ...groupErrors, [sourceRowId]: rowErrors },
          };
        });
      }

      // Exit formula mode
      clearFormulaModeStore();
    },
    [
      table,
      columns,
      onEdit,
      setCellErrors,
      disabledRows,
      disabledColumns,
      tableId,
      excludeFromCopy,
      enableFormulaMode,
      clearFormulaModeStore,
      groupKey,
    ]
  );

  /**
   * Helper function to check if values should be compared as numbers
   */
  const shouldCompareAsNumber = useCallback(
    (
      colDef: ExtendedColumnDef<T> | undefined,
      value1: unknown,
      value2: unknown
    ): boolean => {
      // 1. Check if column explicitly marked as numeric
      if (colDef?.isNumeric) return true;

      const str1 = String(value1 ?? '').trim();
      const str2 = String(value2 ?? '').trim();

      // An empty string is not a number for comparison purposes
      if (str1 === '' || str2 === '') return false;

      // 2. Auto-detect: if both values are valid numbers, treat as numeric.
      // We use a stricter check than parseFloat to avoid partial parsing of strings like "123a".
      const isNumeric = (str: string) => {
        // The isNaN function converts the string to a number, and if it's not a valid number, it returns true.
        // The second check for parseFloat is to handle cases where a string of only whitespace is passed.
        // `!isNaN(' ')` is true because it gets converted to 0, but `parseFloat(' ')` is NaN.
        return !isNaN(Number(str)) && !isNaN(parseFloat(str));
      };

      return isNumeric(str1) && isNumeric(str2);
    },
    []
  );

  // Determine if this row or its group is disabled
  const disabled = isRowDisabled(disabledRows, groupKey, rowIndex);

  // Compute disabled columns once per row
  const disabledColumnsForRow =
    typeof disabledColumns === 'function'
      ? disabledColumns(rowData)
      : disabledColumns || [];

  // TanStack expansion logic
  const canExpand = row.getCanExpand();
  const isExpanded = row.getIsExpanded();

  const resolvedFocusCellIndex = (() => {
    if (!isRowNew || typeof focusConfig !== 'number') return -1;

    const index = focusConfig;
    if (index < 0 || index >= visibleCells.length) return -1;

    const targetCell = visibleCells[index];
    if (!targetCell) return -1;

    const targetColDef = targetCell.column.columnDef as ExtendedColumnDef<T>;
    const targetKey = getColumnKey(targetColDef);
    const targetDisabled =
      disabled || (disabledColumnsForRow || []).includes(targetKey);

    return targetDisabled ? -1 : index;
  })();

  // Combine refs for both row focus and sortable
  const combinedRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      // Set the sortable ref
      setNodeRef(node);
      // Set the row ref for scroll into view
      (rowRef as React.MutableRefObject<HTMLTableRowElement | null>).current =
        node;
    },
    [setNodeRef]
  );

  // Sortable styles
  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <React.Fragment key={rowId}>
      <TableRow
        ref={combinedRef}
        data-sheet-row
        data-row-id={rowId}
        data-dragging={isDragging}
        className={cn(
          'border-none relative', // it's will remove border for icons cells
          disabled ? 'bg-muted' : '',
          dense ? '!h-5 leading-tight' : '!h-9',
          isDragging && 'bg-muted/50 shadow-lg'
        )}
        style={enableDragAndDrop ? sortableStyle : undefined}
      >
        {/* Drag handle cell */}
        {enableDragAndDrop && (
          <TableCell
            className={cn(
              'w-8 px-1 text-center cursor-grab active:cursor-grabbing',
              dense ? 'py-0.5' : 'py-1',
              isRowNew && 'cursor-not-allowed opacity-50'
            )}
            {...attributes}
            {...listeners}
          >
            {isReordering ? (
              <Loader2 className='h-3 w-3 animate-spin text-muted-foreground mx-auto' />
            ) : (
              <GripVertical className='h-3 w-3 text-muted-foreground mx-auto' />
            )}
          </TableCell>
        )}
        {visibleCells.map((cell, cellIndex) => {
          const colDef = cell.column.columnDef as ExtendedColumnDef<T>;
          const colKey = getColumnKey(colDef);

          // Determine if this column is disabled for this specific row
          const isDisabled = disabled || disabledColumnsForRow.includes(colKey);
          const errorMsg = cellErrors[groupKey]?.[rowId]?.[colKey] || null;

          const isEditable = !isDisabled;

          // Detect dirty state by comparing with _original property
          const currentValue = cell.getValue();
          let isDirty = false;
          let originalValueForTooltip = '';

          if (rowData._original && colKey) {
            const originalCellValue = (
              rowData._original as Record<string, unknown>
            )[colKey];

            originalValueForTooltip = String(originalCellValue ?? '');

            if (
              shouldCompareAsNumber(colDef, currentValue, originalCellValue)
            ) {
              // For numeric columns, compare as numbers
              const currentNum = parseFloat(String(currentValue ?? ''));
              const originalNum = parseFloat(String(originalCellValue ?? ''));
              isDirty = currentNum !== originalNum;
            } else {
              // For non-numeric columns, compare as strings
              isDirty = String(currentValue ?? '') !== originalValueForTooltip;
            }
          }

          // Apply sizing logic & indentation
          const style: React.CSSProperties = {};
          if (enableColumnSizing) {
            const size = cell.column.getSize();
            if (size) style.width = `${size}px`;
            if (colDef.minSize) style.minWidth = `${colDef.minSize}px`;
            if (colDef.maxSize) style.maxWidth = `${colDef.maxSize}px`;
          }
          if (cellIndex === 0) {
            style.paddingLeft = `${level * 20}px`;
          }

          // Get the actual cell value for input display
          const cellValue = cell.getValue();
          const displayValue =
            cellValue === null || cellValue === undefined
              ? ''
              : String(cellValue);

          const rawCellContent = flexRender(
            cell.column.columnDef.cell,
            cell.getContext()
          );

          const safeCellContent =
            rawCellContent === null || rawCellContent === undefined
              ? ''
              : rawCellContent;

          const autoFocusCurrentCell =
            resolvedFocusCellIndex >= 0 && cellIndex === resolvedFocusCellIndex;

          const renderEditableCell = (): React.ReactNode => {
            if (colDef.editor) {
              const editorProps: SheetTableEditorProps<T> = {
                value: cellValue,
                displayValue,
                rowData,
                disabled: isDisabled,
                dense,
                autoFocus: autoFocusCurrentCell,
                onChange: (nextValue) =>
                  handleCellValueChange(nextValue, groupKey, rowData, colDef),
              };
              return colDef.editor(editorProps);
            }

            return (
              <CellEditor
                colDef={colDef}
                rowData={rowData}
                value={displayValue}
                disabled={isDisabled}
                dense={dense}
                enableEditing={!isDisabled}
                autoFocus={autoFocusCurrentCell}
                onValueChange={(nextValue) =>
                  handleCellValueChange(nextValue, groupKey, rowData, colDef)
                }
              />
            );
          };

          // Check if this is a select column (checkbox for row selection) or has custom cell renderer without inputType
          const isSelectColumn = colKey === 'select';
          const hasCustomCellRenderer =
            colDef.cell && !colDef.inputType && !colDef.editor;

          const baseCellContent =
            (isDisabled && !(colDef.inputType === 'checkbox')) ||
            isSelectColumn ||
            hasCustomCellRenderer ? (
              <>
                {colDef.showTooltip && !isSelectColumn ? (
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          colDef.className,
                          'px-2',
                          dense ? 'text-sm py-0' : 'py-1',
                          'cursor-help',
                          'truncate',
                          'flex items-center h-full'
                        )}
                      >
                        {safeCellContent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{safeCellContent}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div
                    className={cn(
                      colDef.className,
                      isSelectColumn ? '' : 'px-2 py-0',
                      dense && !isSelectColumn ? 'text-sm' : '',
                      'flex items-center h-full'
                    )}
                  >
                    {safeCellContent}
                  </div>
                )}
              </>
            ) : (
              renderEditableCell()
            );

          const cellContent: React.ReactNode =
            cellIndex === 0 ? (
              <div
                className='flex items-center gap-2 w-full h-full'
                style={{ outline: 'none' }}
              >
                {canExpand && (
                  <button
                    type='button'
                    className={cn(
                      'flex-shrink-0 transition-all duration-200 ease-in-out hover:bg-muted/50 rounded-sm p-0.5',
                      {
                        'opacity-50 cursor-not-allowed': !canExpand,
                      }
                    )}
                    onClick={() => row.toggleExpanded()}
                    disabled={!canExpand}
                  >
                    <div className='relative'>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'transition-all duration-200 ease-in-out',
                          {
                            'rotate-0 opacity-100': isExpanded,
                            'rotate-[-90deg] opacity-0 absolute': !isExpanded,
                          }
                        )}
                      />
                      <ChevronRight
                        size={16}
                        className={cn(
                          'transition-all duration-200 ease-in-out',
                          {
                            'rotate-90 opacity-0 absolute': isExpanded,
                            'rotate-0 opacity-100': !isExpanded,
                          }
                        )}
                      />
                    </div>
                  </button>
                )}
                <div
                  className={cn('flex-grow px-1', dense ? 'text-sm py-0' : '')}
                >
                  {baseCellContent}
                </div>
              </div>
            ) : (
              baseCellContent
            );

          // Check if this row is in formula mode (waiting for reference)
          const isInFormulaMode =
            enableFormulaMode &&
            formulaModeStore &&
            formulaModeStore.sourceRowId === rowId;

          // Check if this cell can be referenced (not the source row)
          // Read from store directly to avoid stale closures
          const currentFormulaMode = enableFormulaMode
            ? useFormulaModeStore.getState().formulaMode
            : null;
          const isInFormulaModeNow =
            currentFormulaMode && currentFormulaMode.sourceRowId === rowId;
          const canBeReferenced =
            enableFormulaMode &&
            currentFormulaMode &&
            !isInFormulaModeNow &&
            isEditable;

          // Handle cell click for formula mode
          const handleCellClick = (
            e: React.MouseEvent<HTMLTableCellElement>
          ) => {
            e.preventDefault();
            e.stopPropagation();
            handleCellReference(rowId);
          };

          return (
            <Tooltip
              key={`${rowId}-${cellIndex}-${colKey}`}
              open={errorMsg ? undefined : false}
            >
              <TooltipTrigger asChild>
                <TableCell
                  key={`${rowId}-${cellIndex}-${colKey}`}
                  data-row-id={row.id}
                  data-cell-id={cell.id}
                  onKeyDown={(e) => handleCellKeyDown(e, row, cellIndex)}
                  onClick={(e) => {
                    if (!enableFormulaMode) return;

                    // Always read from store at click time to avoid stale closures
                    const clickTimeFormulaMode =
                      useFormulaModeStore.getState().formulaMode;
                    if (!clickTimeFormulaMode) return;

                    const clickTimeIsInFormulaMode =
                      clickTimeFormulaMode.sourceRowId === rowId;
                    const clickTimeCanBeReferenced =
                      !clickTimeIsInFormulaMode && isEditable;

                    if (clickTimeCanBeReferenced) {
                      handleCellClick(e);
                    }
                  }}
                  className={cn(
                    'border relative', // 'relative' for absolute icons if you prefer
                    // Don't remove padding for select column - it needs centering
                    isEditable && !isSelectColumn
                      ? '!p-0'
                      : dense
                        ? '!px-2 !py-0'
                        : '!p-1.5',
                    {
                      'bg-muted': isDisabled,
                      'bg-destructive/25': errorMsg,
                      'bg-blue-100 dark:bg-blue-900/30':
                        isDirty &&
                        !isDisabled &&
                        !errorMsg &&
                        !(rowData as Record<string, unknown>).isNew,
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800':
                        (rowData as Record<string, unknown>).isNew &&
                        !isDisabled,
                      'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700':
                        isInFormulaMode,
                      'cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800':
                        canBeReferenced,
                    },
                    typeof colDef.className === 'function'
                      ? colDef.className(rowData)
                      : colDef.className
                  )}
                  style={style}
                >
                  {cellContent}
                </TableCell>
              </TooltipTrigger>
              {errorMsg ? (
                <TooltipContent
                  side='top'
                  className='bg-destructive text-destructive-foreground border border-destructive-foreground/20'
                  sideOffset={-10}
                  align='start'
                >
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-destructive-foreground rounded-full'></div>
                    <p className='text-sm font-medium'>{errorMsg}</p>
                  </div>
                </TooltipContent>
              ) : isDirty ? (
                <TooltipContent
                  side='top'
                  className='bg-blue-600 text-white border border-blue-500'
                  sideOffset={-10}
                  align='start'
                >
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-white rounded-full'></div>
                    <p className='text-sm font-medium'>
                      Original: {originalValueForTooltip}
                    </p>
                  </div>
                </TooltipContent>
              ) : null}
            </Tooltip>
          );
        })}
      </TableRow>

      {/* Collapsible row detail (custom) */}
      {isExpanded && renderRowDetail && (
        <TableRow className={cn(dense ? 'h-auto' : '')}>
          <TableCell
            colSpan={row.getVisibleCells().length}
            className='p-0 border-x'
          >
            <Collapsible open>
              <CollapsibleContent className='animate-in slide-in-from-top-2 fade-in-0'>
                <div className='px-3 py-2 bg-muted/30 transition-colors duration-200'>
                  {renderRowDetail(rowData)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TableCell>
        </TableRow>
      )}

      {/* If expanded via TanStack subRows, render recursively */}
      {isExpanded &&
        row.subRows.map((subRow) => (
          <SheetTableRow
            key={subRow.id}
            row={subRow}
            groupKey={groupKey}
            level={level + 1}
            disabledRows={disabledRows}
            disabledColumns={disabledColumns}
            cellErrors={cellErrors}
            enableColumnSizing={enableColumnSizing}
            dense={dense}
            handleCellValueChange={handleCellValueChange}
            handleCellKeyDown={handleCellKeyDown}
            renderRowDetail={renderRowDetail}
            columns={columns}
            table={table}
            onEdit={onEdit}
            setCellErrors={setCellErrors}
            tableId={tableId}
            excludeFromCopy={excludeFromCopy}
            enableFormulaMode={enableFormulaMode}
          />
        ))}
    </React.Fragment>
  );
}
