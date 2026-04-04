import { create } from 'zustand';

type UpdateRowCallback = (
  rowId: string,
  columnKey: string,
  value: unknown
) => void;

interface FormulaModeState {
  formulaMode: {
    sourceRowId: string;
    sourceTableId?: string; // Optional identifier for the table instance
    updateSourceRow?: UpdateRowCallback; // Callback to update cells in the source row
  } | null;
  setFormulaMode: (
    formulaMode: {
      sourceRowId: string;
      sourceTableId?: string;
      updateSourceRow?: UpdateRowCallback;
    } | null
  ) => void;
  clearFormulaMode: () => void;
}

export const useFormulaModeStore = create<FormulaModeState>((set) => ({
  formulaMode: null,
  setFormulaMode: (formulaMode) => set({ formulaMode }),
  clearFormulaMode: () => set({ formulaMode: null }),
}));
