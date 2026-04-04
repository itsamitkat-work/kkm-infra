import { create } from 'zustand';
import { EstimationRowData } from '../types';

interface ExtraItemsState {
  extraItems: EstimationRowData[];
  itemErrors: Record<string, string>;
  savingItemIds: Record<string, boolean>;
  addExtraItem: (item: EstimationRowData) => void;
  updateExtraItem: (item: EstimationRowData) => void;
  removeExtraItem: (itemId: string) => void;
  setItemError: (itemId: string, error: string | null) => void;
  setSavingItem: (itemId: string, isSaving: boolean) => void;
  clearExtraItems: () => void;
}

export const useExtraItemsStore = create<ExtraItemsState>((set) => ({
  extraItems: [],
  itemErrors: {},
  savingItemIds: {},
  addExtraItem: (item) =>
    set((state) => ({ extraItems: [...state.extraItems, item] })),
  updateExtraItem: (item) =>
    set((state) => ({
      extraItems: state.extraItems.map((i) => (i.id === item.id ? item : i)),
    })),
  removeExtraItem: (itemId) =>
    set((state) => ({
      extraItems: state.extraItems.filter((i) => i.id !== itemId),
    })),
  setItemError: (itemId, error) =>
    set((state) => {
      const newErrors = { ...state.itemErrors };
      if (error) {
        newErrors[itemId] = error;
      } else {
        delete newErrors[itemId];
      }
      return { itemErrors: newErrors };
    }),
  setSavingItem: (itemId, isSaving) =>
    set((state) => {
      const newSavingIds = { ...state.savingItemIds };
      if (isSaving) {
        newSavingIds[itemId] = true;
      } else {
        delete newSavingIds[itemId];
      }
      return { savingItemIds: newSavingIds };
    }),
  clearExtraItems: () =>
    set({ extraItems: [], itemErrors: {}, savingItemIds: {} }),
}));
