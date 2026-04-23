'use client';

import * as React from 'react';
import { create } from 'zustand';
import { produce } from 'immer';
import { useStore } from 'zustand';
import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type Row,
  type RowSelectionState,
  type Table,
  type TableOptions,
  type Updater,
} from '@tanstack/react-table';
import type { ZodTypeAny } from 'zod';
import type { ProjectItemRowType } from '@/types/project-item';

export type ExtendedColumnDef<
  TData extends Record<string, unknown>,
  TValue = unknown,
> = Omit<ColumnDef<TData, TValue>, 'id' | 'accessorKey'> & {
  id?: string;
  accessorKey?: string;
  validationSchema?: ZodTypeAny;
  className?: string;
  style?: React.CSSProperties;
  /**
   * When set with `table-layout: fixed`, column uses this % of table width
   * (minSize/maxSize inline widths are skipped so the % controls layout).
   */
  tableWidthPercent?: number;
  computeValue?: (row: TData) => TValue;
  isNumeric?: boolean;
  onChangeUpdateRow?: (args: {
    newValue: unknown;
    prevRow: TData;
    draftRow: TData;
  }) => Partial<TData> | void;
};

export type RowData<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  subRows?: RowData<T>[];
  id: string;
};

type ProjectItemsDraftRow = RowData<ProjectItemRowType>;

type CellErrorsState = Record<
  string,
  Record<string, Record<string, string | null>>
>;

function withOriginalSnapshot(
  row: ProjectItemRowType
): ProjectItemRowType & { _original: ProjectItemRowType } {
  const base = { ...row };
  return {
    ...base,
    _original: { ...base },
  };
}

/** Keys that affect row dirty state but are not backed by their own grid column (e.g. merged cells). */
const ADDITIONAL_EDIT_TRACKED_KEYS: string[] = [
  'unit_display',
  'reference_schedule_text',
  'schedule_name',
  'schedule_item_id',
];

function getColumnKeysForEdit(
  baseColumns: ExtendedColumnDef<ProjectItemRowType>[]
): string[] {
  const fromColumns = baseColumns
    .map((col) => col.accessorKey as string)
    .filter((key) => key && !['is_edited', '_original'].includes(key));
  return [...new Set([...fromColumns, ...ADDITIONAL_EDIT_TRACKED_KEYS])];
}

function computeRowEdited(
  row: ProjectItemsDraftRow,
  columnKeys: string[],
  baseColumns: ExtendedColumnDef<ProjectItemRowType>[]
): boolean {
  const original = row._original;
  if (!original) {
    return false;
  }

  return columnKeys.some((key) => {
    const currentValue = (row as Record<string, unknown>)[key];
    const originalValue = (original as Record<string, unknown>)[key];

    const colDef = baseColumns.find((col) => col.accessorKey === key);
    const isNumeric = colDef?.isNumeric;

    if (isNumeric) {
      return (
        parseFloat(String(currentValue ?? '')) !==
        parseFloat(String(originalValue ?? ''))
      );
    }
    return String(currentValue ?? '') !== String(originalValue ?? '');
  });
}

const projectItemsGlobalFilterFn = (
  row: Row<ProjectItemRowType>,
  _columnId: string,
  filterValue: unknown
): boolean => {
  const q = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!q) {
    return true;
  }
  const o = row.original;
  const name = String(o.item_description ?? '')
    .toLowerCase();
  const code = String(o.item_code ?? '')
    .toLowerCase();
  const unit = String(o.unit_display ?? '')
    .toLowerCase();
  return name.includes(q) || code.includes(q) || unit.includes(q);
};

type ProjectItemsTableStoreState = {
  rows: ProjectItemsDraftRow[];
  globalFilter: string;
  rowSelection: RowSelectionState;
  columnSizing: ColumnSizingState;
  savingRowId: string | null;
  saveErrors: Record<string, string | null>;
  isBulkOperationInProgress: boolean;
  cellErrors: CellErrorsState;
};

type ProjectItemsTableStoreActions = {
  syncRowsFromServer: (serverRows: ProjectItemRowType[]) => void;
  deleteRow: (rowId: string) => void;
  addRow: (
    newRow: ProjectItemRowType,
    insertAtIndex?: number,
    options?: { original?: ProjectItemRowType | null }
  ) => void;
  updateRow: (rowId: string, rowData: Partial<ProjectItemRowType>) => void;
  cancelUpdate: (rowId: string) => void;
  editCell: (
    rowId: string,
    columnId: string,
    value: unknown,
    baseColumns: ExtendedColumnDef<ProjectItemRowType>[]
  ) => void;
  setGlobalFilterFromTable: (updater: Updater<string>) => void;
  setRowSelectionFromTable: (updater: Updater<RowSelectionState>) => void;
  setColumnSizingFromTable: (updater: Updater<ColumnSizingState>) => void;
  setRowSelection: (
    value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)
  ) => void;
  setSavingRowId: (id: string | null) => void;
  clearSaveErrorForRow: (rowId: string) => void;
  setSaveErrorForRow: (rowId: string, message: string | null) => void;
  setBulkSaveError: (message: string | null) => void;
  setIsBulkOperationInProgress: (value: boolean) => void;
  mergeCellErrors: (updater: React.SetStateAction<CellErrorsState>) => void;
  reorderRowsByOrderedIds: (orderedIds: string[]) => void;
};

type ProjectItemsStore = ProjectItemsTableStoreState &
  ProjectItemsTableStoreActions;

export function createProjectItemsTableStore() {
  return create<ProjectItemsStore>((set, get) => ({
    rows: [],
    globalFilter: '',
    rowSelection: {},
    columnSizing: {},
    savingRowId: null,
    saveErrors: {},
    isBulkOperationInProgress: false,
    cellErrors: {},

    syncRowsFromServer: (serverRows) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const prev = draft.rows;
          const prevById = new Map(
            prev.map((r) => [String(r.id), r] as const)
          );
          const serverList = serverRows ?? [];
          const next: ProjectItemsDraftRow[] = [];
          const mergedLocalIds = new Set<string>();

          for (const serverRow of serverList) {
            const id = String(serverRow.id);
            const local = prevById.get(id);
            if (local && (local.is_edited || local.is_new)) {
              next.push(local);
              mergedLocalIds.add(id);
            } else {
              next.push(
                withOriginalSnapshot(serverRow) as ProjectItemsDraftRow
              );
            }
          }

          for (const local of prev) {
            const id = String(local.id);
            if (mergedLocalIds.has(id)) {
              continue;
            }
            if (local.is_new || local.is_edited) {
              next.push(local);
            }
          }

          draft.rows = next;
        })
      );
    },

    deleteRow: (rowId) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.rows = draft.rows.filter((row) => String(row.id) !== rowId);
        })
      );
    },

    addRow: (newRow, insertAtIndex, options) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const rowData = newRow as ProjectItemsDraftRow;
          const rowWithOriginal: ProjectItemsDraftRow = {
            ...rowData,
            _original:
              options && options.original !== undefined
                ? (options.original as ProjectItemsDraftRow)
                : ({ ...rowData } as ProjectItemsDraftRow),
          };

          if (
            insertAtIndex !== undefined &&
            insertAtIndex >= 0 &&
            insertAtIndex < draft.rows.length
          ) {
            draft.rows.splice(insertAtIndex + 1, 0, rowWithOriginal);
          } else {
            draft.rows.push(rowWithOriginal);
          }
        })
      );
    },

    updateRow: (rowId, rowData) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const idx = draft.rows.findIndex((r) => String(r.id) === rowId);
          if (idx === -1) {
            return;
          }
          const r = draft.rows[idx];
          Object.assign(r, rowData);
          r._original = { ...(r as ProjectItemRowType) } as ProjectItemsDraftRow;
          r.is_edited = false;
          r.is_new = false;
        })
      );
    },

    cancelUpdate: (rowId) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const idx = draft.rows.findIndex((r) => String(r.id) === rowId);
          if (idx === -1) {
            return;
          }
          const row = draft.rows[idx];
          const original = row._original;
          if (original) {
            const id = row.id;
            Object.assign(row, original);
            row.id = id;
            row._original = original;
            row.is_edited = false;
          }
        })
      );
    },

    editCell: (rowId, columnId, value, baseColumns) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const idx = draft.rows.findIndex((r) => String(r.id) === rowId);
          if (idx === -1) {
            return;
          }
          const row = draft.rows[idx];
          (row as Record<string, unknown>)[columnId] = value;

          const colDef = baseColumns.find(
            (col) =>
              (col.accessorKey as string) === columnId || col.id === columnId
          );

          if (colDef && typeof colDef.onChangeUpdateRow === 'function') {
            const patch = colDef.onChangeUpdateRow({
              newValue: value,
              prevRow: row as ProjectItemRowType,
              draftRow: row as ProjectItemRowType,
            });
            if (patch && typeof patch === 'object') {
              Object.assign(row, patch);
            }
          }

          baseColumns.forEach((col) => {
            if (col.computeValue && col.accessorKey) {
              (row as Record<string, unknown>)[col.accessorKey as string] =
                col.computeValue(row as ProjectItemRowType);
            }
          });

          const columnKeys = getColumnKeysForEdit(baseColumns);
          row.is_edited = computeRowEdited(row, columnKeys, baseColumns);
        })
      );
    },

    setGlobalFilterFromTable: (updater) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.globalFilter =
            typeof updater === 'function'
              ? updater(draft.globalFilter)
              : updater;
        })
      );
    },

    setRowSelectionFromTable: (updater) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.rowSelection =
            typeof updater === 'function'
              ? updater(draft.rowSelection)
              : updater;
        })
      );
    },

    setColumnSizingFromTable: (updater) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.columnSizing =
            typeof updater === 'function'
              ? updater(draft.columnSizing)
              : updater;
        })
      );
    },

    setRowSelection: (value) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.rowSelection =
            typeof value === 'function' ? value(draft.rowSelection) : value;
        })
      );
    },

    setSavingRowId: (id) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.savingRowId = id;
        })
      );
    },

    clearSaveErrorForRow: (rowId) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.saveErrors[rowId] = null;
        })
      );
    },

    setSaveErrorForRow: (rowId, message) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.saveErrors[rowId] = message;
        })
      );
    },

    setBulkSaveError: (message) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          if (message === null) {
            delete draft.saveErrors.bulk;
          } else {
            draft.saveErrors.bulk = message;
          }
        })
      );
    },

    setIsBulkOperationInProgress: (value) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.isBulkOperationInProgress = value;
        })
      );
    },

    mergeCellErrors: (updater) => {
      const prev = get().cellErrors;
      const next =
        typeof updater === 'function'
          ? (updater as (p: CellErrorsState) => CellErrorsState)(prev)
          : updater;
      set(
        produce<ProjectItemsStore>((draft) => {
          draft.cellErrors = next;
        })
      );
    },

    reorderRowsByOrderedIds: (orderedIds) => {
      set(
        produce<ProjectItemsStore>((draft) => {
          const byId = new Map(
            draft.rows.map((r) => [String(r.id), r] as const)
          );
          const next: ProjectItemsDraftRow[] = [];
          for (const id of orderedIds) {
            const row = byId.get(id);
            if (row) {
              next.push(row);
            }
          }
          for (const r of draft.rows) {
            if (!orderedIds.includes(String(r.id))) {
              next.push(r);
            }
          }
          draft.rows = next;
        })
      );
    },
  }));
}

export type ItemsTableStore = ReturnType<typeof createProjectItemsTableStore>;

export type ProjectItemsTableApi = {
  table: Table<ProjectItemRowType>;
  updateRow: (rowId: string, patch: Partial<ProjectItemRowType>) => void;
  deleteRow: (rowId: string) => void;
  addRow: (
    newRow: ProjectItemRowType,
    insertAtIndex?: number,
    options?: { original?: ProjectItemRowType | null }
  ) => void;
  cancelUpdate: (rowId: string) => void;
  setRowSelection: (
    value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)
  ) => void;
  reorderRowsByOrderedIds: (orderedIds: string[]) => void;
};

export const PROJECT_ITEMS_ACTIONS_COLUMN_ID = 'actions';
export const PROJECT_ITEMS_REORDER_COLUMN_ID = 'row_reorder';

export function useProjectItemsTable({
  store,
  serverRows,
  columns,
  isPending,
  isLoading,
  getRowCanSelect,
}: {
  store: ItemsTableStore;
  serverRows: ProjectItemRowType[];
  columns: ExtendedColumnDef<ProjectItemRowType>[];
  isPending: boolean;
  isLoading: boolean;
  getRowCanSelect?: (row: { original: ProjectItemRowType }) => boolean;
}) {
  React.useEffect(() => {
    store.getState().syncRowsFromServer(serverRows);
  }, [serverRows, store]);

  const rows = useStore(store, (s) => s.rows);
  const globalFilter = useStore(store, (s) => s.globalFilter);
  const rowSelection = useStore(store, (s) => s.rowSelection);
  const columnSizing = useStore(store, (s) => s.columnSizing);

  const baseColumns = React.useMemo(
    () =>
      columns.filter(
        (col) => col.id !== PROJECT_ITEMS_ACTIONS_COLUMN_ID
      ),
    [columns]
  );

  const editCell = React.useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      store.getState().editCell(rowId, columnId, value, baseColumns);
    },
    [baseColumns, store]
  );

  const mergedOptions: TableOptions<ProjectItemRowType> = React.useMemo(
    () => ({
      data: rows as ProjectItemRowType[],
      columns: columns as unknown as ColumnDef<ProjectItemRowType>[],
      state: {
        globalFilter,
        rowSelection,
        columnSizing,
      },
      onGlobalFilterChange: (updater) => {
        store.getState().setGlobalFilterFromTable(updater);
      },
      onRowSelectionChange: (updater) => {
        store.getState().setRowSelectionFromTable(updater);
      },
      onColumnSizingChange: (updater) => {
        store.getState().setColumnSizingFromTable(updater);
      },
      globalFilterFn: projectItemsGlobalFilterFn,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getRowId: (row) => row.id,
      enableRowSelection: true,
      columnResizeMode: 'onChange',
      ...(getRowCanSelect ? { getRowCanSelect } : {}),
    }),
    [
      rows,
      columns,
      globalFilter,
      rowSelection,
      columnSizing,
      getRowCanSelect,
      store,
    ]
  );

  const table = useReactTable(mergedOptions);

  const api = React.useMemo<ProjectItemsTableApi>(
    () => ({
      table,
      updateRow: (rowId, patch) => {
        store.getState().updateRow(rowId, patch);
      },
      deleteRow: (rowId) => {
        store.getState().deleteRow(rowId);
      },
      addRow: (newRow, insertAtIndex, options) => {
        store.getState().addRow(newRow, insertAtIndex, options);
      },
      cancelUpdate: (rowId) => {
        store.getState().cancelUpdate(rowId);
      },
      setRowSelection: (value) => {
        store.getState().setRowSelection(value);
      },
      reorderRowsByOrderedIds: (orderedIds) => {
        store.getState().reorderRowsByOrderedIds(orderedIds);
      },
    }),
    [table, store]
  );

  const setGlobalFilter = React.useCallback(
    (value: string) => {
      store.getState().setGlobalFilterFromTable(value);
    },
    [store]
  );

  const deleteRow = React.useCallback(
    (rowId: string) => {
      store.getState().deleteRow(rowId);
    },
    [store]
  );

  const addRow = React.useCallback(
    (
      newRow: ProjectItemRowType,
      insertAtIndex?: number,
      options?: {
        original?: ProjectItemRowType | null;
      }
    ) => {
      store.getState().addRow(newRow, insertAtIndex, options);
    },
    [store]
  );

  const updateRow = React.useCallback(
    (rowId: string, rowData: Partial<ProjectItemRowType>) => {
      store.getState().updateRow(rowId, rowData);
    },
    [store]
  );

  const cancelUpdate = React.useCallback(
    (rowId: string) => {
      store.getState().cancelUpdate(rowId);
    },
    [store]
  );

  const setRowSelection = React.useCallback(
    (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      store.getState().setRowSelection(value);
    },
    [store]
  );

  return {
    rows,
    table,
    globalFilter,
    setGlobalFilter,
    editCell,
    deleteRow,
    addRow,
    updateRow,
    cancelUpdate,
    setRowSelection,
    api,
    isTableLoading: !!(isPending || isLoading),
  };
}
