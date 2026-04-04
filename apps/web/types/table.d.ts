import type { RowData } from '@tanstack/react-table';
import type { RowFocusTarget } from '@/components/tables/sheet-table/hooks/use-edit-sheet-table';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    deleteRow?: (rowId: string) => void;
    addRow?: (
      newRow: TData,
      insertAtIndex?: number,
      options?: {
        original?: TData | null;
        focusIndex?: RowFocusTarget;
      }
    ) => void;
    updateRow?: (rowId: string, rowData: Partial<TData>) => void;
    cancelUpdate?: (rowId: string) => void;
    editCell?: (rowId: string, columnId: string, value: unknown) => void;
    bulkSave?: () => void;
    discardAll?: () => void;
    startLoading?: (rowId: string) => void;
    stopLoading?: (rowId: string) => void;
    loadingRows?: Set<string>;
    [key: string]: unknown;
  }
}
