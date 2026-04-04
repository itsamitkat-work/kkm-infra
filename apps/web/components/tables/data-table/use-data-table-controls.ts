'use client';

import * as React from 'react';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

import { useQueryState } from '@/hooks/use-query-state';
import { Filter } from '@/components/ui/filters';
import { useDebounce } from '@/hooks/use-debounce';

const defaultRowSelection = {};
const defaultColumnVisibility = {};
const defaultColumnFilters: ColumnFiltersState = [];
const defaultSorting: SortingState = [];
const defaultFilters: Filter[] = [];
const defaultSearch = '';

export type DataTableControls = {
  clearRowSelection: () => void;
  filters: Filter[];
  handleFiltersChange: (filters: Filter[]) => void;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  state: {
    sorting: SortingState;
    columnVisibility: VisibilityState;
    rowSelection: Record<string, boolean>;
    columnFilters: ColumnFiltersState;
  };
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  onColumnVisibilityChange: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >;
  onRowSelectionChange: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  onColumnFiltersChange: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
};

export const useDataTableControls = (
  tableId: string = 'data-table',
  initialDefaultFilters?: Filter[],
  initialDefaultSort?: SortingState
): DataTableControls => {
  const [querySearch, setQuerySearch] = useQueryState<string>(
    `${tableId}-search`,
    defaultSearch
  );
  const [search, setSearch] = React.useState<string>(querySearch);
  const debouncedSearch = useDebounce(search, 500);

  React.useEffect(() => {
    setQuerySearch(debouncedSearch);
  }, [debouncedSearch, setQuerySearch]);

  const [rowSelection, setRowSelection] = useQueryState<
    Record<string, boolean>
  >(`${tableId}-rowSelection`, defaultRowSelection);

  const [columnVisibility, setColumnVisibility] =
    useQueryState<VisibilityState>(
      `${tableId}-columnVisibility`,
      defaultColumnVisibility
    );

  const [columnFilters, setColumnFilters] = useQueryState<ColumnFiltersState>(
    `${tableId}-columnFilters`,
    defaultColumnFilters
  );

  const initialSortValue =
    initialDefaultSort && initialDefaultSort.length > 0
      ? initialDefaultSort
      : defaultSorting;

  const [sorting, setSorting] = useQueryState<SortingState>(
    `${tableId}-sorting`,
    initialSortValue
  );

  const [filters, setFilters] = useQueryState<Filter[]>(
    `${tableId}-filters`,
    defaultFilters
  );

  // Track if default filters have been initialized
  const hasInitializedDefaults = React.useRef(false);

  // Initialize default filters only once on mount if provided and filters are empty
  React.useEffect(() => {
    if (
      initialDefaultFilters &&
      initialDefaultFilters.length > 0 &&
      !hasInitializedDefaults.current &&
      filters.length === 0
    ) {
      hasInitializedDefaults.current = true;
      setFilters(initialDefaultFilters);
    }
  }, [initialDefaultFilters, filters.length, setFilters]);

  const handleFiltersChange = React.useCallback(
    (filters: Filter[]) => {
      setFilters(filters);
    },
    [setFilters]
  );

  const clearRowSelection = React.useCallback(() => {
    setRowSelection({});
  }, [setRowSelection]);

  return {
    clearRowSelection,
    filters,
    handleFiltersChange,
    search,
    setSearch,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
  };
};
