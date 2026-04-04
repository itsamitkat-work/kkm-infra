import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  TableOptions,
  ColumnSizingState,
  Table,
  ColumnDef,
  RowSelectionState,
  Row,
  OnChangeFn,
  Updater,
  ExpandedState,
} from '@tanstack/react-table';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import {
  Filter,
  FilterFieldConfig,
  type Filter as FilterType,
} from '@/components/ui/filters';
import { ZodTypeAny } from 'zod';
import React from 'react';
import {
  RowData,
  RowFocusTarget,
  useEditSheetTable,
} from './use-edit-sheet-table';
import { applyAdvancedFilters } from '@/lib/filter-utils';

export interface UseSheetTableOptions<T extends Record<string, unknown>> {
  columns: ExtendedColumnDef<T>[];
  data: T[];
  enableColumnSizing?: boolean;
  tableOptions?: Partial<TableOptions<T>> & {
    getRowCanSelect?: (row: Row<T>) => boolean;
  };
  filters?: FilterFieldConfig[];
  searchKeys?: string[]; // Keys to search in (default: all string fields)
  rowDataZodSchema?: ZodTypeAny;
  dataLoader?: () => Promise<T[]>;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  totalDBRowCount?: number;
  isInfiniteLoading?: boolean;
  fetchAllPages?: boolean;
  isPending?: boolean;
  isLoading?: boolean;
}

export interface UseSheetTableReturn<T extends Record<string, unknown>> {
  table: Table<T>;
  columnSizing: ColumnSizingState;
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  cellErrors: Record<string, Record<string, Record<string, string | null>>>;
  setCellErrors: React.Dispatch<
    React.SetStateAction<
      Record<string, Record<string, Record<string, string | null>>>
    >
  >;
  // Filter state
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  filterFields: FilterFieldConfig[] | undefined;
  appliedFilters: FilterType[];
  handleFiltersChange: (filters: FilterType[]) => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilters: Array<{ id: string; value: unknown }>;
  data: RowData<T>[];
  filteredData: T[];
  handleFilterChange: (filterId: string, value: unknown) => void;
  handleClearFilter: (filterId: string) => void;
  handleClearAllFilters: () => void;
  editedRowsCount: number;
  deleteRow: (rowId: string) => void;
  addRow: (
    newRow: T,
    insertAtIndex?: number,
    options?: {
      original?: T | null;
      focusIndex?: RowFocusTarget;
    }
  ) => void;
  updateRow: (rowId: string, rowData: Partial<T>) => void;
  cancelUpdate: (rowId: string) => void;
  editCell: (rowId: string, columnId: string, value: unknown) => void;
  bulkSave: () => void;
  discardAll: () => void;
  reorderRows: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
  loadingRows: Set<string>;
  startLoading: (rowId: string) => void;
  stopLoading: (rowId: string) => void;
  isPending?: boolean;
  isFetchingNextPage?: boolean;
  // Row selection
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}

/**
 * useSheetTable - A custom hook that wraps useReactTable
 *
 * This hook manages all the state for the SheetTable component and provides
 * the table instance to the parent component, allowing the parent to access
 * and control the table state.
 *
 * @param options - Configuration options for the table
 * @returns Object containing table instance and state management functions
 */
export function useSheetTable<T extends { id: string }>(
  options: UseSheetTableOptions<T>
): UseSheetTableReturn<T> {
  const {
    columns,
    enableColumnSizing = false,
    tableOptions = {},
    filters = [],
    searchKeys = [],
    data: initialData,
    isPending,
    isLoading: isLoadingProp,
    isFetchingNextPage,
  } = options;

  const [appliedFilters, setAppliedFilters] = React.useState<Filter[]>([]);

  const {
    data,
    editedRowsCount,
    deleteRow,
    addRow,
    updateRow,
    cancelUpdate,
    editCell,
    bulkSave,
    discardAll,
    reorderRows,
  } = useEditSheetTable<T>(
    columns,
    initialData as RowData<T>[],
    options.rowDataZodSchema
  );

  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

  const startLoading = useCallback((rowId: string) => {
    setLoadingRows((prev) => new Set(prev).add(rowId));
  }, []);

  const stopLoading = useCallback((rowId: string) => {
    setLoadingRows((prev) => {
      const newLoadingRows = new Set(prev);
      newLoadingRows.delete(rowId);
      return newLoadingRows;
    });
  }, []);

  /**
   * If column sizing is enabled, we track sizes in state.
   */
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  /**
   * Expanded state for sub-rows. Keyed by row.id in TanStack Table.
   */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /**
   * Row selection state for bulk operations
   */
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  /**
   * Track errors/original content keyed by (groupKey, rowId) for editing.
   */
  const [cellErrors, setCellErrors] = useState<
    Record<string, Record<string, Record<string, string | null>>>
  >({});
  const handleFiltersChange = (filters: Filter[]) => {
    setAppliedFilters(filters);
  };
  /**
   * Filter state management
   */
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Calculate active filters
   */
  const activeFilters = useMemo(() => {
    return Object.entries(filterValues)
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some((v) => v !== undefined && v !== '');
        }
        return value !== undefined && value !== '';
      })
      .map(([key, value]) => ({ id: key, value }));
  }, [filterValues]);

  /**
   * Filter data based on search and filters
   */
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter
    if (searchValue && searchValue.trim() !== '') {
      result = result.filter((item) => {
        // If searchKeys are provided, only search in those fields
        const keysToSearch =
          searchKeys.length > 0
            ? searchKeys
            : Object.keys(item).filter(
                (key) =>
                  typeof (item as Record<string, unknown>)[key] === 'string'
              );

        return keysToSearch.some((key) => {
          const value = (item as Record<string, unknown>)[key];
          return (
            value &&
            String(value).toLowerCase().includes(searchValue.toLowerCase())
          );
        });
      });
    }

    // Apply advanced filters
    result = applyAdvancedFilters(result, appliedFilters, filters || []);

    return result;
  }, [data, searchValue, appliedFilters, filters, searchKeys]);

  /**
   * Filter handling functions - memoized to prevent unnecessary re-renders
   */
  const handleFilterChange = useCallback((filterId: string, value: unknown) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  }, []);

  const handleClearFilter = useCallback((filterId: string) => {
    setFilterValues((prev) => {
      const newValues = { ...prev };
      delete newValues[filterId];
      return newValues;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilterValues({});
  }, []);

  const tableMeta = useMemo(
    () => ({
      deleteRow,
      addRow,
      updateRow,
      cancelUpdate,
      editCell,
      bulkSave,
      discardAll,
      startLoading,
      stopLoading,
      loadingRows,
    }),
    [
      deleteRow,
      addRow,
      updateRow,
      cancelUpdate,
      editCell,
      bulkSave,
      discardAll,
      startLoading,
      stopLoading,
      loadingRows,
    ]
  );

  /**
   * Build the final table options. Merge user-provided tableOptions with ours.
   */
  const mergedOptions: TableOptions<T> = useMemo(
    () => ({
      data: filteredData,
      columns: columns as unknown as ColumnDef<T>[], // Type cast to avoid column definition type conflicts
      getRowId: (row: RowData<T>) => (row as RowData<T>).id,
      getCoreRowModel: getCoreRowModel(),
      // Provide subRows if you have them:
      getSubRows: (row: RowData<T>) => (row as RowData<T>).subRows ?? undefined,
      // Add expansions
      getExpandedRowModel: getExpandedRowModel(),
      // Let caller control if rows can expand (e.g., via table definition)
      getRowCanExpand: tableOptions.getRowCanExpand,
      enableExpanding: true,
      // External expanded state
      state: {
        // If user also provided tableOptions.state, merge them
        ...(tableOptions.state ?? {}),
        expanded,
        rowSelection,
        ...(enableColumnSizing
          ? {
              columnSizing,
            }
          : {}),
      },
      // Enable row selection
      enableRowSelection: true,
      onRowSelectionChange: setRowSelection,
      // Allow custom function to determine if a row can be selected
      ...(tableOptions.getRowCanSelect
        ? {
            getRowCanSelect: tableOptions.getRowCanSelect,
          }
        : {}),
      onExpandedChange: ((updaterOrValue: Updater<ExpandedState>) => {
        if (typeof updaterOrValue === 'function') {
          setExpanded((old) => {
            const result = updaterOrValue(old);
            // If result is boolean, return old state
            return typeof result === 'boolean' ? old : result;
          });
        } else {
          // If updaterOrValue is boolean, don't update
          if (typeof updaterOrValue !== 'boolean') {
            setExpanded(updaterOrValue);
          }
        }
      }) as OnChangeFn<ExpandedState>,

      // If sizing is enabled, pass sizing states:
      ...(enableColumnSizing
        ? {
            onColumnSizingChange: setColumnSizing,
            columnResizeMode: tableOptions.columnResizeMode ?? 'onChange',
          }
        : {}),

      meta: tableMeta,

      // Spread any other user-provided table options
      ...tableOptions,
    }),
    [
      filteredData,
      columns,
      expanded,
      rowSelection,
      columnSizing,
      enableColumnSizing,
      tableOptions,
      tableMeta,
    ]
  );

  /**
   * Initialize the table using TanStack Table.
   */
  const table = useReactTable<T>(mergedOptions);

  return {
    table,
    columnSizing,
    setColumnSizing,
    expanded,
    setExpanded,
    cellErrors,
    setCellErrors,
    // Filter state and functions
    searchValue,
    setSearchValue,
    filterFields: filters,
    appliedFilters,
    handleFiltersChange,
    showFilters,
    setShowFilters,
    activeFilters,
    data,
    filteredData,
    handleFilterChange,
    handleClearFilter,
    handleClearAllFilters,
    editedRowsCount,
    deleteRow,
    addRow,
    updateRow,
    cancelUpdate,
    editCell,
    bulkSave,
    discardAll,
    reorderRows,
    isLoading: !!(isPending || isLoadingProp),
    loadingRows,
    startLoading,
    stopLoading,
    isPending,
    isFetchingNextPage,
    rowSelection,
    setRowSelection,
  };
}
