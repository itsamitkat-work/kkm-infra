import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

const KEY_SEPARATOR = '::';

export interface UseCheckboxGridOptions<T> {
  /** Server data - all items (or just checked items if getIsChecked not provided) */
  serverData: T[];
  /** Extract row ID from item */
  getRowId: (item: T) => string;
  /** Extract column ID from item */
  getColumnId: (item: T) => string;
  /** Extract server record ID from item */
  getId: (item: T) => string;
  /**
   * Optional: Check if item is checked on server.
   * If not provided, all items in serverData are considered checked.
   * If provided, only items where this returns true are considered checked.
   */
  getIsChecked?: (item: T) => boolean;
}

export interface CheckboxGridState {
  /** Check if a cell is currently checked (local state) */
  isChecked: (rowId: string, columnId: string) => boolean;
  /** Check if a cell exists on server (has data, regardless of checked state) */
  existsOnServer: (rowId: string, columnId: string) => boolean;
  /** Check if a cell was checked on server */
  wasCheckedOnServer: (rowId: string, columnId: string) => boolean;
  /** Check if a cell is newly added/checked (checked locally but not on server) */
  isNewlyAdded: (rowId: string, columnId: string) => boolean;
  /** Check if a cell is pending removal/unchecked (unchecked locally but was checked on server) */
  isPendingRemoval: (rowId: string, columnId: string) => boolean;
  /** Toggle a single cell */
  toggleCell: (rowId: string, columnId: string, checked: boolean) => void;
  /** Get column header state (true, false, or 'indeterminate') */
  getColumnHeaderState: (
    columnId: string,
    allRowIds: string[]
  ) => boolean | 'indeterminate';
  /** Toggle all cells in a column */
  toggleColumn: (
    columnId: string,
    checked: boolean,
    allRowIds: string[]
  ) => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Get diff for saving - returns items to insert and IDs to delete */
  getDiff: () => {
    toInsert: Array<{ rowId: string; columnId: string }>;
    toDelete: string[];
  };
  /** Get all currently checked item IDs */
  getCheckedIds: () => string[];
  /** Reset local state to match server state */
  reset: () => void;
}

function createKey(rowId: string, columnId: string): string {
  return `${rowId}${KEY_SEPARATOR}${columnId}`;
}

function parseKey(key: string): { rowId: string; columnId: string } {
  const [rowId, columnId] = key.split(KEY_SEPARATOR);
  return { rowId, columnId };
}

export function useCheckboxGrid<T>({
  serverData,
  getRowId,
  getColumnId,
  getId,
  getIsChecked,
}: UseCheckboxGridOptions<T>): CheckboxGridState {
  // Store accessor functions in refs to avoid dependency issues
  const getRowIdRef = useRef(getRowId);
  const getColumnIdRef = useRef(getColumnId);
  const getIdRef = useRef(getId);
  const getIsCheckedRef = useRef(getIsChecked);

  // Update refs on each render
  getRowIdRef.current = getRowId;
  getColumnIdRef.current = getColumnId;
  getIdRef.current = getId;
  getIsCheckedRef.current = getIsChecked;

  // Server state: key -> server record ID (for all items that exist)
  // Server checked state: keys that are checked on server
  const { serverItemMap, serverCheckedKeys } = useMemo(() => {
    const itemMap = new Map<string, string>();
    const checkedKeys = new Set<string>();

    serverData.forEach((item) => {
      const key = createKey(
        getRowIdRef.current(item),
        getColumnIdRef.current(item)
      );
      itemMap.set(key, getIdRef.current(item));

      // If getIsChecked is provided, use it; otherwise all items are considered checked
      const isChecked = getIsCheckedRef.current
        ? getIsCheckedRef.current(item)
        : true;
      if (isChecked) {
        checkedKeys.add(key);
      }
    });

    return { serverItemMap: itemMap, serverCheckedKeys: checkedKeys };
  }, [serverData]);

  // Local checked state - tracks which cells are checked
  const [localCheckedState, setLocalCheckedState] = useState<Set<string>>(
    () => new Set(serverCheckedKeys)
  );

  // Track previous server state to detect changes
  const prevServerCheckedKeysRef = useRef(serverCheckedKeys);

  // Sync local state when server data changes
  useEffect(() => {
    if (prevServerCheckedKeysRef.current !== serverCheckedKeys) {
      setLocalCheckedState(new Set(serverCheckedKeys));
      prevServerCheckedKeysRef.current = serverCheckedKeys;
    }
  }, [serverCheckedKeys]);

  // Check if a cell is checked (local state)
  const isChecked = useCallback(
    (rowId: string, columnId: string) => {
      return localCheckedState.has(createKey(rowId, columnId));
    },
    [localCheckedState]
  );

  // Check if a cell exists on server (has data)
  const existsOnServer = useCallback(
    (rowId: string, columnId: string) => {
      return serverItemMap.has(createKey(rowId, columnId));
    },
    [serverItemMap]
  );

  // Check if a cell was checked on server
  const wasCheckedOnServer = useCallback(
    (rowId: string, columnId: string) => {
      return serverCheckedKeys.has(createKey(rowId, columnId));
    },
    [serverCheckedKeys]
  );

  // Check if a cell is newly added/checked
  const isNewlyAdded = useCallback(
    (rowId: string, columnId: string) => {
      const key = createKey(rowId, columnId);
      return localCheckedState.has(key) && !serverCheckedKeys.has(key);
    },
    [localCheckedState, serverCheckedKeys]
  );

  // Check if a cell is pending removal/unchecked
  const isPendingRemoval = useCallback(
    (rowId: string, columnId: string) => {
      const key = createKey(rowId, columnId);
      return !localCheckedState.has(key) && serverCheckedKeys.has(key);
    },
    [localCheckedState, serverCheckedKeys]
  );

  // Toggle a single cell
  const toggleCell = useCallback(
    (rowId: string, columnId: string, checked: boolean) => {
      const key = createKey(rowId, columnId);
      setLocalCheckedState((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    []
  );

  // Get column header state
  const getColumnHeaderState = useCallback(
    (columnId: string, allRowIds: string[]): boolean | 'indeterminate' => {
      if (allRowIds.length === 0) return false;

      const checkedCount = allRowIds.filter((rowId) =>
        localCheckedState.has(createKey(rowId, columnId))
      ).length;

      if (checkedCount === 0) return false;
      if (checkedCount === allRowIds.length) return true;
      return 'indeterminate';
    },
    [localCheckedState]
  );

  // Toggle all cells in a column
  const toggleColumn = useCallback(
    (columnId: string, checked: boolean, allRowIds: string[]) => {
      setLocalCheckedState((prev) => {
        const next = new Set(prev);
        allRowIds.forEach((rowId) => {
          const key = createKey(rowId, columnId);
          if (checked) {
            next.add(key);
          } else {
            next.delete(key);
          }
        });
        return next;
      });
    },
    []
  );

  // Track if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (localCheckedState.size !== serverCheckedKeys.size) return true;

    // Check for additions
    for (const key of localCheckedState) {
      if (!serverCheckedKeys.has(key)) return true;
    }

    return false;
  }, [localCheckedState, serverCheckedKeys]);

  // Get diff for saving (insert/delete pattern)
  const getDiff = useCallback(() => {
    const toInsert: Array<{ rowId: string; columnId: string }> = [];
    const toDelete: string[] = [];

    // Find additions (checked locally but not on server)
    for (const key of localCheckedState) {
      if (!serverCheckedKeys.has(key)) {
        toInsert.push(parseKey(key));
      }
    }

    // Find deletions (was checked on server but not locally)
    for (const key of serverCheckedKeys) {
      if (!localCheckedState.has(key)) {
        const serverId = serverItemMap.get(key);
        if (serverId) {
          toDelete.push(serverId);
        }
      }
    }

    return { toInsert, toDelete };
  }, [localCheckedState, serverCheckedKeys, serverItemMap]);

  // Get all currently checked item IDs (for toggle pattern where you send all checked IDs)
  const getCheckedIds = useCallback(() => {
    const ids: string[] = [];
    for (const key of localCheckedState) {
      const id = serverItemMap.get(key);
      if (id) {
        ids.push(id);
      }
    }
    return ids;
  }, [localCheckedState, serverItemMap]);

  // Reset local state to match server state
  const reset = useCallback(() => {
    setLocalCheckedState(new Set(serverCheckedKeys));
  }, [serverCheckedKeys]);

  return {
    isChecked,
    existsOnServer,
    wasCheckedOnServer,
    isNewlyAdded,
    isPendingRemoval,
    toggleCell,
    getColumnHeaderState,
    toggleColumn,
    hasChanges,
    getDiff,
    getCheckedIds,
    reset,
  };
}
