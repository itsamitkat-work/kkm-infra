import { create } from 'zustand';

interface EstimationState {
  updatedAmounts: Record<string, number>;
  updatedQuantities: Record<string, number>;
  setUpdatedAmount: (itemId: string, newAmount: number) => void;
  setUpdatedQuantity: (itemId: string, newQuantity: number) => void;
  clearAmounts: () => void;
}

export const useEstimationStore = create<EstimationState>((set) => ({
  updatedAmounts: {},
  updatedQuantities: {},
  setUpdatedAmount: (itemId, newAmount) =>
    set((state) => ({
      updatedAmounts: { ...state.updatedAmounts, [itemId]: newAmount },
    })),
  setUpdatedQuantity: (itemId, newQuantity) =>
    set((state) => ({
      updatedQuantities: { ...state.updatedQuantities, [itemId]: newQuantity },
    })),
  clearAmounts: () => set({ updatedAmounts: {}, updatedQuantities: {} }),
}));
