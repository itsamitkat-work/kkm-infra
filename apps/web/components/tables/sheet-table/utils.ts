/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * components/sheet-table/utils.ts
 *
 * Utility functions, types, and helpers used by the SheetTable component.
 *
 * We include:
 * - ExtendedColumnDef and SheetTableProps
 * - parseAndValidate function
 * - getColumnKey function
 * - handleKeyDown, handlePaste
 *
 * This is purely for organization: the code is identical in functionality
 * to what was previously in sheet-table.tsx (just split out).
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { ZodType } from 'zod';
import React from 'react';
import type { UseSheetTableReturn } from '@/components/tables/sheet-table/hooks/use-sheet-table';
import type { FilterFieldConfig } from '@/components/ui/filters';

/**
 * ExtendedColumnDef<TData, TValue>:
 * - Inherits everything from TanStack's ColumnDef<TData, TValue>
 * - Forces existence of optional `accessorKey?: string` and `id?: string`
 * - Adds our optional `validationSchema` property (for column-level Zod).
 * - Adds optional `className` and `style` properties for custom styling.
 */
export type ExtendedColumnDef<
  TData extends Record<string, unknown>,
  TValue = unknown,
> = Omit<ColumnDef<TData, TValue>, 'id' | 'accessorKey'> & {
  id?: string;
  accessorKey?: string;
  validationSchema?: ZodType<any>;
  className?: string | ((row: TData) => string); // Allows static or dynamic class names
  style?: React.CSSProperties; // style for inline styles
  /**
   * Optional function to compute this column's value from other columns in the row
   * @param row - The current row data
   * @returns The computed value for this column
   */
  computeValue?: (row: TData) => TValue;
  /**
   * Indicates if this column should be compared as a numeric value
   * Useful for columns that store numbers as strings but should be compared numerically
   */
  isNumeric?: boolean;
  /**
   * Input type configuration for this column
   * - "input": Regular text input (default)
   * - "autocomplete": AutocompleteInput with suggestions
   * - "combobox": Combobox with searchable dropdown
   * - "select": Simple select dropdown (future enhancement)
   */
  inputType?:
    | 'input'
    | 'autocomplete'
    | 'combobox'
    | 'select'
    | 'date'
    | 'textarea'
    | 'checkbox';
  /**
   * Configuration for input components
   */
  inputConfig?: {
    /**
     * Suggestions for autocomplete/combobox inputs
     * Can be static array or function that returns suggestions based on row data
     */
    suggestions?: string[] | ((rowData: TData) => string[]);
    /**
     * Options for combobox inputs that include richer metadata.
     * Accepts a static array or a callback receiving the current row data.
     */
    options?: unknown[] | ((rowData: TData) => unknown[]);
    /**
     * Maximum number of suggestions to show
     */
    maxSuggestions?: number;
    /**
     * Trigger character for autocomplete in textarea (default: "#")
     */
    triggerChar?: string;
    /**
     * Optional function to format the selected value before inserting it.
     * Receives the selected suggestion and returns the formatted string to insert.
     * Default behavior: inserts the suggestion as-is with a space after it.
     */
    formatSelectedValue?: (suggestion: string) => string;
    /**
     * Placeholder text for the input
     */
    placeholder?: string;
    /**
     * Whether to allow free text input (for combobox)
     */
    allowFreeText?: boolean;
    /**
     * Preferred number of visible rows (only for textarea inputType)
     */
    rows?: number;
    /**
     * Minimum number of rows to show initially (textarea only)
     */
    minRows?: number;
    /**
     * Maximum number of rows before becoming scrollable (textarea only)
     */
    maxRows?: number;
    /**
     * Optional search handler for server-side filtering
     */
    onSearch?: (query: string) => void;
    /**
     * Optional placeholder for the search input inside the combobox dropdown
     */
    searchPlaceholder?: string;
    /**
     * Optional callback for infinite scroll
     */
    onLoadMore?: () => void;
    /**
     * Flag to indicate if more data is available
     */
    hasMore?: boolean;
    /**
     * Flag to show loading state
     */
    loading?: boolean;
    /**
     * Optional callback to extract a stable id for each option (combobox only)
     */
    getOptionId?: (option: unknown, rowData: TData) => string;
    /**
     * Optional callback to derive a display label for each option
     */
    getOptionLabel?: (option: unknown, rowData: TData) => string;
    /**
     * Custom renderer for each option in combobox dropdown
     */
    renderOption?: (
      option: unknown,
      ctx: { rowData: TData; isSelected: boolean; searchValue: string }
    ) => React.ReactNode;
    /**
     * Custom renderer for selected value in combobox trigger
     */
    renderSelectedValue?: (
      option: unknown | null,
      rowData: TData
    ) => React.ReactNode;
    /**
     * Optional custom filter to use for local combobox filtering
     */
    filterOption?: (option: unknown, query: string, rowData: TData) => boolean;
    /**
     * Optional segmented filter options rendered above the search input
     */
    filterOptions?: { id: string; label: string }[];
    /**
     * Currently selected filter option id
     */
    filterValue?: string | null;
    /**
     * Placeholder for the filter selector trigger
     */
    filterPlaceholder?: string;
    /**
     * Handler invoked when the filter selection changes
     */
    onFilterChange?: (value: string | null) => void;
  };

  showTooltip?: boolean;

  /**
   * Optional callback invoked when this column's value changes via editing.
   * Return a partial row object to update other fields in the same row.
   *
   * Example use-cases:
   * - Changing a code populates name, unit, scheduleName, etc.
   * - Selecting an item updates multiple dependent fields.
   */
  onChangeUpdateRow?: (args: {
    newValue: unknown;
    prevRow: TData;
    draftRow: TData; // draft including the just-applied value for this column
  }) => Partial<TData> | void;

  /**
   * Optional custom editor renderer invoked in place of the default CellEditor.
   * Receives helpers to update the cell value and information about the row/cell.
   */
  editor?: (props: SheetTableEditorProps<TData>) => React.ReactNode;
};

/**
 * Props for the SheetTable component.
 * Includes footer props and additional TanStack table configurations.
 */
export interface SheetTableProps<T extends Record<string, unknown>> {
  /**
   * Optional unique identifier for this table instance.
   * Used for cross-table formula mode functionality.
   */
  id?: string;

  /**
   * Column definitions for the table.
   */
  columns: ExtendedColumnDef<T>[];

  /**
   * The sheet table instance from useSheetTable hook containing
   * table instance and all state management functions
   */
  sheetTable: UseSheetTableReturn<T>;

  /**
   * Optional filters configuration
   */
  filters?: FilterFieldConfig[];

  /**
   * Optional search configuration
   */
  searchConfig?: {
    placeholder?: string;
    enabled?: boolean;
  };

  /**
   * Optional action buttons to display on the right side
   */
  actions?: React.ReactNode;

  /**
   * Optional bulk actions to display below the search/filters
   */
  bulkActions?: React.ReactNode;

  /**
   * Callback for handling cell edits.
   */
  onEdit?: <K extends keyof T>(
    rowIndex: string,
    columnId: K,
    value: T[K]
  ) => void;

  /**
   * Callback for when a cell is focused.
   */
  onCellFocus?: (rowId: string) => void;

  /**
   * Columns that are disabled for editing.
   * Can be an array of column names or a function that returns disabled columns based on row data.
   */
  disabledColumns?: string[] | ((rowData: T) => string[]);

  /**
   * Rows that are disabled for editing.
   * Can be an array of row indices or a record mapping column IDs to row indices.
   */
  disabledRows?: number[] | Record<string, number[]>;

  /**
   * Whether to show the table header.
   */
  showHeader?: boolean;

  /**
   * If true, column sizing is enabled. Sizes are tracked in local state.
   */
  enableColumnSizing?: boolean;

  enableHotkey?: boolean;

  /**
   * Configuration for Add/Remove row icons:
   * { add?: "left" | "right"; remove?: "left" | "right"; }
   * Example: { add: "left", remove: "right" }
   */
  rowActions?: {
    add?: 'left' | 'right';
    remove?: 'left' | 'right';
  };

  /**
   * Optional function to handle adding a new row at the end of the table.
   * This is called when the "Add New Row" button is clicked.
   */
  addNewRow?: () => void;

  /**
   * Optional predicate to determine if a new row should be appended automatically.
   * Invoked whenever table data changes; when it returns true, `addNewRow` is called.
   */
  autoAddRowIf?: (context: {
    data: T[];
    table: UseSheetTableReturn<T>['table'];
  }) => boolean;

  /**
   * Whether to use dense table layout for more compact display.
   */
  dense?: boolean;

  /**
   * Optional renderer for a collapsible detail panel shown below a row when expanded.
   * If provided, each row will display an expand/collapse control and render this
   * content inside a shadcn Collapsible within a full-width detail row.
   */
  renderRowDetail?: (row: T) => React.ReactNode;

  /**
   * Placement for group headers when grouping by `headerKey`.
   * - "row": Render as a header row inside the table (default)
   * - "outside": Render as a separate header element above the table,
   *   not inside the table rows.
   */
  groupHeaderPlacement?: 'row' | 'outside';

  /**
   * Optional react node to display when in loading state
   */
  loadingMessage?: React.ReactNode;

  /**
   * Optional react node to display when an error occurs
   */
  errorState?: React.ReactNode;

  /**
   * Optional react node to display when there is no data
   */
  emptyState?: React.ReactNode;

  /**
   * Optional className for the table container div
   */
  containerClassName?: string;

  /**
   * Optional callback to handle CMD+S / CTRL+S keyboard shortcut for saving a row.
   */
  onSaveShortcut?: (rowData: T, rowIndex?: number) => void;

  /**
   * Optional total amount to display in the header.
   */
  totalAmount?: number;

  /**
   * Columns to exclude from being copied during formula mode.
   * Array of column keys to exclude. Useful for excluding IDs, computed values, or other row-specific data.
   */
  excludeFromCopy?: string[];

  /**
   * Enable Excel-like formula mode where typing "=" and clicking another cell copies its value.
   * Defaults to false. Set to true to enable formula mode functionality.
   */
  enableFormulaMode?: boolean;

  /**
   * Enable drag and drop row reordering.
   * When enabled, a drag handle column will be added to the table.
   */
  enableDragAndDrop?: boolean;

  /**
   * Whether a reorder operation is in progress.
   * Used to show loading state on the drag handle.
   */
  isReordering?: boolean;
}

export interface SheetTableEditorProps<T extends Record<string, unknown>> {
  value: unknown;
  displayValue: string;
  rowData: T;
  disabled: boolean;
  dense: boolean;
  autoFocus: boolean;
  onChange: (value: unknown) => void;
}

/**
 * Returns a stable string key for each column (id > accessorKey > "").
 */
export function getColumnKey<T extends Record<string, unknown>>(
  colDef: ExtendedColumnDef<T>
): string {
  return colDef.id ?? colDef.accessorKey ?? '';
}

/**
 * Parse & validate helper:
 * - If colDef is numeric and empty => undefined (if optional)
 * - If colDef is numeric and invalid => produce error
 */
export function parseAndValidate<T extends Record<string, unknown>>(
  rawValue: unknown,
  colDef: ExtendedColumnDef<T>
): { parsedValue: unknown; errorMessage: string | null } {
  const schema = colDef.validationSchema;
  if (!schema) {
    // No validation => no error
    return { parsedValue: rawValue, errorMessage: null };
  }

  let parsedValue: unknown = rawValue;
  let errorMessage: string | null = null;

  const schemaType = (schema as any)?._def?.typeName;
  if (schemaType === 'ZodNumber') {
    if (rawValue === null || rawValue === undefined) {
      parsedValue = undefined;
    } else if (typeof rawValue === 'number') {
      parsedValue = rawValue;
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed === '') {
        parsedValue = undefined;
      } else {
        const maybeNum = parseFloat(trimmed);
        parsedValue = Number.isNaN(maybeNum) ? rawValue : maybeNum;
      }
    } else {
      const maybeNum = Number(rawValue);
      parsedValue = Number.isNaN(maybeNum) ? rawValue : maybeNum;
    }
  } else if (typeof rawValue === 'string') {
    parsedValue = rawValue;
  }

  const result = schema.safeParse(parsedValue);
  if (!result.success) {
    errorMessage = result.error.issues[0].message;
  } else {
    parsedValue = result.data;
  }

  return { parsedValue, errorMessage };
}

/**
 * BLOCK non-numeric characters in numeric columns, including paste.
 * (We keep these separate so they're easy to import and use in the main component.)
 */

export function handleKeyDown<T extends Record<string, unknown>>(
  e: React.KeyboardEvent<HTMLTableCellElement | HTMLDivElement>,
  colDef: ExtendedColumnDef<T>
) {
  if (!colDef.validationSchema) return;

  const schemaType = (colDef.validationSchema as any)?._def?.typeName;
  if (schemaType === 'ZodNumber') {
    // Allowed keys for numeric input:
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
      '.',
      '-',
    ];
    const isDigit = /^[0-9]$/.test(e.key);

    if (!allowedKeys.includes(e.key) && !isDigit) {
      e.preventDefault();
    }
  }
}

export function handlePaste<T extends Record<string, unknown>>(
  e: React.ClipboardEvent<HTMLTableCellElement | HTMLDivElement>,
  colDef: ExtendedColumnDef<T>
) {
  if (!colDef.validationSchema) return;
  const schemaType = (colDef.validationSchema as any)?._def?.typeName;
  if (schemaType === 'ZodNumber') {
    const text = e.clipboardData.getData('text');
    // If the pasted text is not a valid float, block it.
    if (!/^-?\d*\.?\d*$/.test(text)) {
      e.preventDefault();
    }
  }
}

/**
 * Helper function to determine if a row is disabled based on the provided
 * disabledRows prop. This prop can be either a simple array of row indices
 * or a record keyed by groupKey mapped to arrays of row indices.
 */
export function isRowDisabled(
  rows: number[] | Record<string, number[]> | undefined,
  groupKey: string,
  rowIndex: number
): boolean {
  if (!rows) return false;
  if (Array.isArray(rows)) {
    return rows.includes(rowIndex);
  }
  return rows[groupKey]?.includes(rowIndex) ?? false;
}
