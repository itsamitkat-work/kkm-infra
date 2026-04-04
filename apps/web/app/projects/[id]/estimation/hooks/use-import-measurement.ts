import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { ItemMeasurmentRowData } from '../types';
import { UseSheetTableReturn } from '@/components/tables/sheet-table/hooks/use-sheet-table';

interface UseImportMeasurementOptions {
  sheetTable: UseSheetTableReturn<ItemMeasurmentRowData>;
  createNewRow: (headerKey?: string) => ItemMeasurmentRowData;
}

export function useImportMeasurement({
  sheetTable,
  createNewRow,
}: UseImportMeasurementOptions) {
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleImportFromMeasurement = useCallback(
    (importedItems: ItemMeasurmentRowData[]) => {
      const meta = sheetTable.table.options.meta;
      if (!meta?.addRow || !meta?.deleteRow) return;

      // Check if there's an empty row at the end (isNew: true but isEdited: false)
      const rows = sheetTable.table.getRowModel().rows;
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const lastRowData = lastRow.original as ItemMeasurmentRowData;
        if (lastRowData.isNew && !lastRowData.isEdited) {
          // Delete the empty row before adding new imported rows
          meta.deleteRow?.(lastRowData.id);
        }
      }

      const importedItemIds: string[] = [];

      importedItems.forEach((item) => {
        // Create an empty original row for the imported item
        const emptyOriginal = createNewRow(item.headerKey);
        // Add the imported item to the table
        (
          meta.addRow as (
            rowData: ItemMeasurmentRowData,
            index: number,
            originalRow: { original: ItemMeasurmentRowData }
          ) => void
        )(item, sheetTable.table.getRowModel().rows.length, {
          original: emptyOriginal,
        });
        importedItemIds.push(item.id);
      });

      // Show success toast with undo action
      const itemCount = importedItems.length;
      toast.success(
        `${itemCount} ${
          itemCount === 1 ? 'item' : 'items'
        } imported successfully`,
        {
          action: {
            label: 'Undo',
            onClick: () => {
              // Remove all imported items
              importedItemIds.forEach((itemId) => {
                meta.deleteRow?.(itemId);
              });
              toast.info(
                `${itemCount} ${itemCount === 1 ? 'item' : 'items'} removed`
              );
            },
          },
          duration: 5000,
        }
      );
    },
    [sheetTable, createNewRow]
  );

  return {
    showImportDialog,
    setShowImportDialog,
    handleImportFromMeasurement,
  };
}
