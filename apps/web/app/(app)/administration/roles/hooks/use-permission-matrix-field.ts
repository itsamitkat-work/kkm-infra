'use client';

import * as React from 'react';

import type {
  CheckboxGridColumn,
  CheckboxGridRow,
} from '@/components/tables/checkbox-grid';
import type { CheckboxGridState } from '@/hooks/use-checkbox-grid';

import type { PermissionCatalogRow } from '../api/tenant-roles-api';
import { buildPermissionMatrix } from '../lib/permission-matrix';

function cellMapKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`;
}

export function usePermissionMatrixField(
  catalogRows: PermissionCatalogRow[],
  selectedIds: string[],
  onIdsChange: (ids: string[]) => void,
  readOnly: boolean
): {
  rows: CheckboxGridRow[];
  columns: CheckboxGridColumn[];
  cellExists: (rowId: string, columnId: string) => boolean;
  gridState: CheckboxGridState;
} {
  const { rows, columns, cellsByKey } = React.useMemo(
    () => buildPermissionMatrix(catalogRows),
    [catalogRows]
  );

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const isChecked = React.useCallback(
    (rowId: string, columnId: string) => {
      const cell = cellsByKey.get(cellMapKey(rowId, columnId));
      if (!cell) {
        return false;
      }
      return selectedSet.has(cell.id);
    },
    [cellsByKey, selectedSet]
  );

  const toggleCell = React.useCallback(
    (rowId: string, columnId: string, checked: boolean) => {
      if (readOnly) {
        return;
      }
      const cell = cellsByKey.get(cellMapKey(rowId, columnId));
      if (!cell) {
        return;
      }
      const next = new Set(selectedSet);
      if (checked) {
        next.add(cell.id);
      } else {
        next.delete(cell.id);
      }
      onIdsChange([...next]);
    },
    [cellsByKey, selectedSet, onIdsChange, readOnly]
  );

  const getColumnHeaderState = React.useCallback(
    (columnId: string, allRowIds: string[]): boolean | 'indeterminate' => {
      const applicableRowIds = allRowIds.filter((rid) =>
        cellsByKey.has(cellMapKey(rid, columnId))
      );
      if (applicableRowIds.length === 0) {
        return false;
      }
      let checkedCount = 0;
      for (const rid of applicableRowIds) {
        const cell = cellsByKey.get(cellMapKey(rid, columnId));
        if (cell && selectedSet.has(cell.id)) {
          checkedCount += 1;
        }
      }
      if (checkedCount === 0) {
        return false;
      }
      if (checkedCount === applicableRowIds.length) {
        return true;
      }
      return 'indeterminate';
    },
    [cellsByKey, selectedSet]
  );

  const toggleColumn = React.useCallback(
    (columnId: string, checked: boolean, allRowIds: string[]) => {
      if (readOnly) {
        return;
      }
      const next = new Set(selectedSet);
      for (const rowId of allRowIds) {
        const cell = cellsByKey.get(cellMapKey(rowId, columnId));
        if (!cell) {
          continue;
        }
        if (checked) {
          next.add(cell.id);
        } else {
          next.delete(cell.id);
        }
      }
      onIdsChange([...next]);
    },
    [cellsByKey, selectedSet, onIdsChange, readOnly]
  );

  const cellExists = React.useCallback(
    (rowId: string, columnId: string) =>
      cellsByKey.has(cellMapKey(rowId, columnId)),
    [cellsByKey]
  );

  const existsOnServer = React.useCallback(
    (rowId: string, columnId: string) => cellExists(rowId, columnId),
    [cellExists]
  );

  const wasCheckedOnServer = isChecked;

  const isNewlyAdded = React.useCallback(() => false, []);

  const isPendingRemoval = React.useCallback(() => false, []);

  const getDiff = React.useCallback(
    () => ({ toInsert: [] as Array<{ rowId: string; columnId: string }>, toDelete: [] as string[] }),
    []
  );

  const getCheckedIds = React.useCallback(
    () => [...selectedSet],
    [selectedSet]
  );

  const reset = React.useCallback(() => {}, []);

  const gridState = React.useMemo(
    (): CheckboxGridState => ({
      isChecked,
      existsOnServer,
      wasCheckedOnServer,
      isNewlyAdded,
      isPendingRemoval,
      toggleCell,
      getColumnHeaderState,
      toggleColumn,
      hasChanges: false,
      getDiff,
      getCheckedIds,
      reset,
    }),
    [
      isChecked,
      existsOnServer,
      wasCheckedOnServer,
      isNewlyAdded,
      isPendingRemoval,
      toggleCell,
      getColumnHeaderState,
      toggleColumn,
      getDiff,
      getCheckedIds,
      reset,
    ]
  );

  return { rows, columns, cellExists, gridState };
}
