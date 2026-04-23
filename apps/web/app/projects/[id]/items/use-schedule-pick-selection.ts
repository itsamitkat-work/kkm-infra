import { useRef, useCallback } from 'react';
import type { BoqSchedulePick } from '@/app/(app)/schedule-items/boq-schedule-pick';

class SchedulePickSelectionManager {
  private selections = new Map<string, BoqSchedulePick>();

  setSelection(rowId: string, pick: BoqSchedulePick): void {
    this.selections.set(String(rowId), pick);
  }

  getSelection(rowId: string): BoqSchedulePick | undefined {
    return this.selections.get(String(rowId));
  }

  clearSelection(rowId: string): void {
    this.selections.delete(String(rowId));
  }

  clearAll(): void {
    this.selections.clear();
  }

  migrateSelection(fromRowId: string, toRowId: string): void {
    const from = String(fromRowId);
    const to = String(toRowId);
    if (from === to) {
      return;
    }
    const pick = this.selections.get(from);
    if (pick) {
      this.selections.set(to, pick);
      this.selections.delete(from);
    }
  }
}

const selectionManager = new SchedulePickSelectionManager();

export function useSchedulePickSelection(rowId: string | undefined) {
  const rowIdRef = useRef(rowId);

  if (rowIdRef.current !== rowId) {
    rowIdRef.current = rowId;
  }

  const setSelection = useCallback((pick: BoqSchedulePick) => {
    if (rowIdRef.current) {
      selectionManager.setSelection(String(rowIdRef.current), pick);
    }
  }, []);

  const getSelection = useCallback((): BoqSchedulePick | undefined => {
    if (rowIdRef.current) {
      return selectionManager.getSelection(String(rowIdRef.current));
    }
    return undefined;
  }, []);

  const clearSelection = useCallback(() => {
    if (rowIdRef.current) {
      selectionManager.clearSelection(String(rowIdRef.current));
    }
  }, []);

  return {
    setSelection,
    getSelection,
    clearSelection,
  };
}

export function getSelectedSchedulePick(rowId: string): BoqSchedulePick | undefined {
  return selectionManager.getSelection(String(rowId));
}

/** After a new BOQ row is persisted, its `id` changes; move the in-memory pick to the new key. */
export function migrateSchedulePickSelection(
  fromRowId: string,
  toRowId: string
): void {
  selectionManager.migrateSelection(fromRowId, toRowId);
}
