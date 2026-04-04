import { useRef, useCallback } from 'react';
import { MasterItem } from '@/hooks/items/types';

/**
 * Centralized manager for master item selection state.
 * Uses a Map to store selections keyed by row ID.
 * This provides a clean way to share selection state across components
 * without prop drilling or complex state management.
 */
class MasterItemSelectionManager {
  private selections = new Map<string, MasterItem>();

  /**
   * Store the selected master item for a row
   */
  setSelection(rowId: string, masterItem: MasterItem): void {
    this.selections.set(String(rowId), masterItem);
  }

  /**
   * Get the selected master item for a row
   */
  getSelection(rowId: string): MasterItem | undefined {
    return this.selections.get(String(rowId));
  }

  /**
   * Clear the selection for a row (optional cleanup)
   */
  clearSelection(rowId: string): void {
    this.selections.delete(String(rowId));
  }

  /**
   * Clear all selections (useful for cleanup)
   */
  clearAll(): void {
    this.selections.clear();
  }
}

// Singleton instance - shared across all components
const selectionManager = new MasterItemSelectionManager();

/**
 * Hook to manage master item selection for a specific row.
 * Provides a clean API for storing and retrieving selected master items.
 */
export function useMasterItemSelection(rowId: string | undefined) {
  const rowIdRef = useRef(rowId);

  // Update ref when rowId changes
  if (rowIdRef.current !== rowId) {
    rowIdRef.current = rowId;
  }

  const setSelection = useCallback((masterItem: MasterItem) => {
    if (rowIdRef.current) {
      selectionManager.setSelection(String(rowIdRef.current), masterItem);
    }
  }, []);

  const getSelection = useCallback((): MasterItem | undefined => {
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

/**
 * Get the selected master item for a row (for use outside of React components)
 */
export function getSelectedMasterItem(rowId: string): MasterItem | undefined {
  return selectionManager.getSelection(String(rowId));
}
