import type { PermissionCatalogRow } from '../api/tenant-roles-api';

import type { CheckboxGridColumn, CheckboxGridRow } from '@/components/tables/checkbox-grid';

/** Column id for permission keys that have no `.` separator (sparse / legacy). */
export const MATRIX_SINGLE_COLUMN_ID = '__single__';

const COLUMN_PRIORITY = [
  'read',
  'manage',
  'create',
  'update',
  'delete',
];

export type PermissionMatrixCell = PermissionCatalogRow & {
  rowId: string;
  columnId: string;
};

/**
 * Splits `resource.action` keys (e.g. `clients.read`) into matrix axes.
 * Uses the last `.` so `foo.bar.baz` → row `foo.bar`, column `baz`.
 */
export function parsePermissionKey(key: string): {
  rowId: string;
  columnId: string;
} {
  const lastDot = key.lastIndexOf('.');
  if (lastDot <= 0) {
    return { rowId: key, columnId: MATRIX_SINGLE_COLUMN_ID };
  }
  return {
    rowId: key.slice(0, lastDot),
    columnId: key.slice(lastDot + 1),
  };
}

function sortRowIds(rowIds: string[]): string[] {
  return [...new Set(rowIds)].sort((a, b) => a.localeCompare(b));
}

function sortColumnIds(columnIds: string[]): string[] {
  return [...new Set(columnIds)].sort((a, b) => {
    if (a === MATRIX_SINGLE_COLUMN_ID) {
      return 1;
    }
    if (b === MATRIX_SINGLE_COLUMN_ID) {
      return -1;
    }
    const pa = COLUMN_PRIORITY.indexOf(a);
    const pb = COLUMN_PRIORITY.indexOf(b);
    if (pa !== -1 && pb !== -1) {
      return pa - pb;
    }
    if (pa !== -1) {
      return -1;
    }
    if (pb !== -1) {
      return 1;
    }
    return a.localeCompare(b);
  });
}

function humanizeRowLabel(rowId: string): string {
  return rowId
    .split(/[._]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function humanizeColumnLabel(columnId: string): string {
  if (columnId === MATRIX_SINGLE_COLUMN_ID) {
    return 'Permission';
  }
  return columnId.charAt(0).toUpperCase() + columnId.slice(1);
}

export function buildPermissionMatrix(catalogRows: PermissionCatalogRow[]): {
  rows: CheckboxGridRow[];
  columns: CheckboxGridColumn[];
  cellsByKey: Map<string, PermissionMatrixCell>;
} {
  const cells: PermissionMatrixCell[] = catalogRows.map((row) => {
    const { rowId, columnId } = parsePermissionKey(row.key);
    return { ...row, rowId, columnId };
  });

  const rowIds = sortRowIds(cells.map((c) => c.rowId));
  const columnIds = sortColumnIds(cells.map((c) => c.columnId));

  const rows: CheckboxGridRow[] = rowIds.map((id) => ({
    id,
    label: humanizeRowLabel(id),
  }));

  const columns: CheckboxGridColumn[] = columnIds.map((id) => ({
    id,
    label: humanizeColumnLabel(id),
  }));

  const cellsByKey = new Map<string, PermissionMatrixCell>();
  for (const cell of cells) {
    cellsByKey.set(`${cell.rowId}::${cell.columnId}`, cell);
  }

  return { rows, columns, cellsByKey };
}
