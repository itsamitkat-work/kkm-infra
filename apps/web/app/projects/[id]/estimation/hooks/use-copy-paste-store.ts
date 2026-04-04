import { create } from 'zustand';
import { ItemMeasurmentRowData } from '../types';

interface CopyPasteState {
  copiedRows: ItemMeasurmentRowData[];
  copiedRowIds: Set<string>; // Track original row IDs for visual indication
  sourceItemId: string | null;
  copiedAt: number | null;
  setCopiedRows: (
    rows: ItemMeasurmentRowData[],
    sourceItemId: string,
    originalRowIds: string[]
  ) => void;
  clearCopiedRows: () => void;
  hasCopiedRows: () => boolean;
  isRowCopied: (itemId: string, rowId: string) => boolean;
}

export const useCopyPasteStore = create<CopyPasteState>((set, get) => ({
  copiedRows: [],
  copiedRowIds: new Set(),
  sourceItemId: null,
  copiedAt: null,
  setCopiedRows: (rows, sourceItemId, originalRowIds) =>
    set({
      copiedRows: rows,
      copiedRowIds: new Set(originalRowIds),
      sourceItemId,
      copiedAt: Date.now(),
    }),
  clearCopiedRows: () =>
    set({
      copiedRows: [],
      copiedRowIds: new Set(),
      sourceItemId: null,
      copiedAt: null,
    }),
  hasCopiedRows: () => get().copiedRows.length > 0,
  isRowCopied: (itemId, rowId) => {
    const state = get();
    return state.sourceItemId === itemId && state.copiedRowIds.has(rowId);
  },
}));
