import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { TableMeta } from '@tanstack/react-table';
import { toast } from 'sonner';
import { useSheetTable } from '@/components/tables/sheet-table/hooks/use-sheet-table';
import { parseNumber } from '@/lib/utils';

import { useEstimation, EstimationItem } from '@/hooks/use-estimation';
import { useProjectItemMeasurmentMutations } from './use-project-item-measurment-mutations';
import { useEstimationStore } from './use-estimation-store';
import { useImportMeasurement } from './use-import-measurement';
import { useCopyPasteStore } from './use-copy-paste-store';
import { getColumns } from '../components/item-measurement-table-columns';
import { calculateQuantity } from '../utils';
import {
  ItemMeasurmentRowData,
  ProjectItemType,
  rowDataZodSchema,
} from '../types';
import { useProjectSegments } from '../../hooks/use-project-segments';
import { ALL_SEGMENTS_TOGGLE_VALUE } from '../../hooks/use-project-segments-filter';
import { useAuth } from '@/hooks/auth';

interface UseItemMeasurementLogicProps {
  projectItemHashId: string;
  rate: number;
  scheduleQuantity: number;
  type: ProjectItemType;
  selectedSegmentId?: string;
}

export function useItemMeasurementLogic({
  projectItemHashId,
  rate,
  scheduleQuantity,
  type,
  selectedSegmentId,
}: UseItemMeasurementLogicProps) {
  const setUpdatedAmount = useEstimationStore(
    (state) => state.setUpdatedAmount
  );
  const setUpdatedQuantity = useEstimationStore(
    (state) => state.setUpdatedQuantity
  );
  const params = useParams();
  const projectHashId = params.id as string;

  const { segments } = useProjectSegments(projectHashId);
  const segmentNames = React.useMemo(
    () => segments.map((segment) => segment.segmentName),
    [segments]
  );

  // Helper function to extract segmentHashId from description
  const getSegmentHashIdFromDescription = React.useCallback(
    (description: string): string | undefined => {
      if (!description || !segments.length) return undefined;

      // Match #segment_name: or #segment_name (allows spaces in segment name)
      const match = description.match(/#([^#:]+)/);
      if (!match) return undefined;

      // Extract and trim the segment name (removes trailing spaces before colon)
      const segmentName = match[1].trim();
      if (!segmentName) return undefined;

      const segment = segments.find(
        (s) => s.segmentName.toLowerCase() === segmentName.toLowerCase()
      );

      return segment?.hashId;
    },
    [segments]
  );

  // Helper function to check if description is a closing tag (#)
  const isClosingTag = React.useCallback((description: string): boolean => {
    if (!description) return false;
    const trimmed = description.trim();
    // Check if it's just "#" or "# " (closing tag)
    return trimmed === '#' || trimmed === '# ';
  }, []);

  const {
    handleSave: handleSaveWithResult,
    handleDelete,
    handleBulkDelete,
    handleReorder,
    saveErrors,
  } = useProjectItemMeasurmentMutations(
    projectItemHashId,
    projectHashId,
    type,
    segments
  );

  const createNewRow = React.useCallback(
    (headerKey?: string): ItemMeasurmentRowData => {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newRow = {
        id: newId,
        date: '',
        description: '',
        no1: 0,
        no2: 0,
        length: 0,
        width: 0,
        height: 0,
        quantity: 0,
        rate: rate,
        schedule_quantity: scheduleQuantity,
        isNew: true,
        isEdited: false,
        headerKey: headerKey,
        checked: 'false',
        verified: 'false',
      };

      return {
        ...newRow,
        quantity: calculateQuantity(newRow),
      } as ItemMeasurmentRowData;
    },
    [rate, scheduleQuantity]
  );

  // Fetch estimation data from API
  const {
    data: estimationData,
    isLoading,
    isError,
  } = useEstimation(projectItemHashId, type);

  const {
    setCopiedRows,
    copiedRows,
    hasCopiedRows,
    sourceItemId,
    isRowCopied: isRowCopiedStore,
    clearCopiedRows,
  } = useCopyPasteStore();

  // Create a wrapper function that binds the projectItemHashId
  const isRowCopied = React.useCallback(
    (rowId: string) => {
      return isRowCopiedStore(projectItemHashId, rowId);
    },
    [isRowCopiedStore, projectItemHashId]
  );

  // Transform API data to table rows and filter by segment if selectedSegmentId is provided
  const { filteredData, orderKeyBoundaries: calculatedBoundaries } =
    React.useMemo(() => {
      if (!estimationData?.data) {
        return {
          filteredData: [],
          orderKeyBoundaries: { lower: undefined, upper: undefined },
        };
      }

      // First, transform all data
      const allData = estimationData.data.map((item: EstimationItem) => {
        const initialRow = {
          id: item.hashId,
          date: item.createdOn
            ? new Date(item.createdOn).toLocaleDateString()
            : '',
          description: item.description,
          no1: item.no1,
          no2: item.no2,
          length: item.length,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          rate: rate,
          schedule_quantity: scheduleQuantity,
          isEdited: false,
          isNew: false,
          checked: item.checked?.toString() || 'false',
          verified: item.verified?.toString() || 'false',
          orderKey: item.orderKey,
        };

        return {
          ...initialRow,
          quantity: calculateQuantity(initialRow) ?? 0,
        };
      });

      // If no selectedSegmentId or "All segments" is selected, return all data
      if (
        !selectedSegmentId ||
        selectedSegmentId === ALL_SEGMENTS_TOGGLE_VALUE
      ) {
        return {
          filteredData: allData,
          orderKeyBoundaries: { lower: undefined, upper: undefined },
        };
      }

      // Filter by segment logic
      // Measurements are sorted by orderKey
      // If a measurement has segmentHashId matching selectedSegmentId, include it and all following
      // measurements until we encounter a closing tag (#) or another measurement with different segmentHashId
      const filtered: typeof allData = [];
      let isInSegment = false;
      let segmentStartIndex = -1;
      let segmentEndIndex = -1;

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const rowSegmentHashId = getSegmentHashIdFromDescription(
          row.description || ''
        );

        // Check if this is a closing tag
        if (isClosingTag(row.description || '')) {
          if (isInSegment) {
            // End of segment
            segmentEndIndex = i - 1;
            break;
          }
          continue; // Skip closing tags when not in segment
        }

        // Check if this row starts a new segment
        if (rowSegmentHashId === selectedSegmentId) {
          if (!isInSegment) {
            isInSegment = true;
            segmentStartIndex = i;
          }
          filtered.push(row);
        } else if (isInSegment) {
          // We're in a segment, check if this row belongs to a different segment
          if (rowSegmentHashId && rowSegmentHashId !== selectedSegmentId) {
            // Different segment starts, end current segment
            segmentEndIndex = i - 1;
            break;
          }
          // Continue including rows in the segment
          filtered.push(row);
        }
      }

      // Calculate orderKey boundaries
      let lowerBound: number | undefined = undefined;
      let upperBound: number | undefined = undefined;
      let lastItemOrderKey: number | undefined = undefined;

      if (segmentStartIndex > 0) {
        // Lower bound: orderKey of the last measurement before the segment
        const prevRow = allData[segmentStartIndex - 1];
        lowerBound = prevRow.orderKey;
      }

      if (segmentEndIndex >= 0) {
        // We found an end to the segment
        // Last item in segment: orderKey of the last measurement in the segment
        const lastRowInSegment = allData[segmentEndIndex];
        lastItemOrderKey = lastRowInSegment.orderKey;

        if (segmentEndIndex < allData.length - 1) {
          // Upper bound: orderKey of the first measurement after the segment
          const nextRow = allData[segmentEndIndex + 1];
          upperBound = nextRow.orderKey;
        }
        // If segmentEndIndex === allData.length - 1, segment ends at the last item, no upper bound
      } else if (isInSegment && filtered.length > 0) {
        // Segment continues to the end, no upper bound
        // Last item in segment: orderKey of the last measurement in the filtered segment
        const lastRowInSegment = filtered[filtered.length - 1];
        lastItemOrderKey = lastRowInSegment.orderKey;
        upperBound = undefined;
      }

      return {
        filteredData: filtered,
        orderKeyBoundaries: {
          lower: lowerBound,
          upper: upperBound,
          lastItemOrderKey: lastItemOrderKey,
        },
      };
    }, [
      estimationData,
      rate,
      scheduleQuantity,
      selectedSegmentId,
      getSegmentHashIdFromDescription,
      isClosingTag,
    ]);

  const initialData = filteredData;

  // Wrapper to maintain backward compatibility with void return type
  // Pass orderKeyBoundaries for new measurements in segmented view
  const handleSave = React.useCallback(
    async (
      rowData: ItemMeasurmentRowData,
      meta: TableMeta<ItemMeasurmentRowData>,
      rowIndex?: number
    ): Promise<void> => {
      await handleSaveWithResult(rowData, meta, {
        rowIndex,
        orderKeyBoundaries: calculatedBoundaries,
      });
    },
    [handleSaveWithResult, calculatedBoundaries]
  );

  // Define columns after handleSave is available
  const columns = useMemo(
    () =>
      getColumns({
        handleSave,
        handleDelete,
        saveErrors,
        type,
        createNewRow,
        isRowCopied,
        segmentNames,
      }),
    [
      handleSave,
      handleDelete,
      saveErrors,
      createNewRow,
      type,
      isRowCopied,
      segmentNames,
    ]
  );

  const searchKeys = React.useMemo(() => ['description'], []);
  const filters = React.useMemo(() => [], []);

  const sheetTable = useSheetTable<ItemMeasurmentRowData>({
    columns: columns,
    data: initialData,
    enableColumnSizing: true,
    filters: filters,
    searchKeys: searchKeys,
    rowDataZodSchema: rowDataZodSchema,
    tableOptions: {
      // Allow selecting all rows
    },
  });

  // Get selected rows for bulk operations
  const selectedRows = React.useMemo(() => {
    return sheetTable.table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTable.table, sheetTable.rowSelection]);

  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = React.useState(false);

  const { showImportDialog, setShowImportDialog, handleImportFromMeasurement } =
    useImportMeasurement({
      sheetTable,
      createNewRow,
    });

  const handleBulkDeleteClick = React.useCallback(() => {
    if (selectedRows.length === 0 || isDeleting) return;
    setDeleteError(null);
    setShowBulkDeleteDialog(true);
  }, [selectedRows.length, isDeleting]);

  const confirmBulkDelete = React.useCallback(async () => {
    if (
      selectedRows.length === 0 ||
      !sheetTable.table.options.meta ||
      isDeleting
    )
      return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await handleBulkDelete(
        selectedRows,
        sheetTable.table.options.meta as TableMeta<ItemMeasurmentRowData>
      );

      // Clear selection after successful deletion
      sheetTable.setRowSelection({});
      setShowBulkDeleteDialog(false);
    } catch (error) {
      // Error is already handled in handleBulkDelete with toast, but we also show it in dialog
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while deleting items.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRows, handleBulkDelete, sheetTable, isDeleting]);

  const { rows } = sheetTable.table.getRowModel();
  const { totalAmount, totalQuantity } = React.useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const quantity = parseNumber(
          row.original._original?.quantity?.toString() ?? ''
        );
        const rate = parseNumber(
          row.original._original?.rate?.toString() ?? ''
        );
        if (!isNaN(quantity)) {
          acc.totalQuantity += quantity;
          if (!isNaN(rate)) {
            acc.totalAmount += quantity * rate;
          }
        }
        return acc;
      },
      { totalAmount: 0, totalQuantity: 0 }
    );
  }, [rows]);

  // Count rows that need to be saved
  const editedRowsCount = React.useMemo(() => {
    return rows.filter((row) => row.original.isEdited === true).length;
  }, [rows]);

  // Handler to save all edited/new rows
  const handleSaveAll = React.useCallback(async () => {
    if (
      editedRowsCount === 0 ||
      !sheetTable.table.options.meta ||
      isSavingAll
    ) {
      return;
    }

    setIsSavingAll(true);
    const meta = sheetTable.table.options
      .meta as TableMeta<ItemMeasurmentRowData>;

    // Get all rows that need saving with their indices
    const rowsToSave = rows
      .filter((row) => row.original.isEdited === true)
      .map((row) => ({ rowData: row.original, rowIndex: row.index }));

    let successCount = 0;
    let failureCount = 0;

    // Save all rows sequentially to avoid overwhelming the server
    for (const { rowData, rowIndex } of rowsToSave) {
      const result = await handleSaveWithResult(rowData, meta, {
        suppressToast: true,
        rowIndex,
        orderKeyBoundaries: calculatedBoundaries,
      });
      if (result?.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Show summary toast
    if (failureCount === 0) {
      // All succeeded
      toast.success(`Successfully saved ${successCount} item(s)!`);
    } else {
      // Some failed
      toast.error(`Saved ${successCount} item(s), ${failureCount} failed.`, {
        description:
          failureCount > 0
            ? 'Some items could not be saved. Please check and try again.'
            : undefined,
      });
    }

    setIsSavingAll(false);
  }, [
    editedRowsCount,
    sheetTable.table,
    rows,
    handleSaveWithResult,
    isSavingAll,
    calculatedBoundaries,
  ]);

  // Handler to discard all edited rows
  const handleDiscardAll = React.useCallback(() => {
    if (editedRowsCount === 0) return;

    const rowsToDiscard = rows.filter(
      (row) => row.original.isEdited === true
    ).length;

    // Use the discardAll function from sheetTable
    sheetTable.discardAll();

    // Clear cell errors for discarded rows
    if (sheetTable.setCellErrors) {
      const editedRowIds = rows
        .filter((row) => row.original.isEdited === true)
        .map((row) => row.id);

      sheetTable.setCellErrors((prev) => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach((groupKey) => {
          const groupErrors = newErrors[groupKey];
          if (groupErrors) {
            editedRowIds.forEach((rowId) => {
              if (groupErrors[rowId]) {
                delete groupErrors[rowId];
              }
            });
          }
        });
        return newErrors;
      });
    }

    toast.success(`Discarded changes for ${rowsToDiscard} row(s)`);
  }, [editedRowsCount, rows, sheetTable]);

  React.useEffect(() => {
    setUpdatedAmount(projectItemHashId, totalAmount);
    setUpdatedQuantity(projectItemHashId, totalQuantity);
  }, [
    totalAmount,
    totalQuantity,
    projectItemHashId,
    setUpdatedAmount,
    setUpdatedQuantity,
  ]);

  const { ability } = useAuth();

  const measurementPermissions = React.useMemo(
    () => ({
      canCheckMSR: ability.can('check', 'project_measurement'),
      canCheckBLG: ability.can('check', 'project_billing'),
      canVerifyMSR: ability.can('verify', 'project_measurement'),
      canVerifyBLG: ability.can('verify', 'project_billing'),
    }),
    [ability]
  );

  const getDisabledColumns = React.useCallback(
    (rowData: ItemMeasurmentRowData): string[] => {
      const alwaysDisabled = ['select', 'actions', 'date', 'quantity'];
      const editableColumns = [
        'description',
        'no1',
        'no2',
        'length',
        'width',
        'height',
      ];

      const { canCheckMSR, canCheckBLG, canVerifyMSR, canVerifyBLG } =
        measurementPermissions;

      function canCheckForType(): boolean {
        if (type === 'MSR') return canCheckMSR;
        if (type === 'BLG') return canCheckBLG;
        return false;
      }

      function canVerifyForType(): boolean {
        if (type === 'MSR') return canVerifyMSR;
        if (type === 'BLG') return canVerifyBLG;
        return false;
      }

      const conditionallyDisabled: string[] = [];

      if (rowData.verified === 'true') {
        conditionallyDisabled.push(...editableColumns);
      }

      if (!canCheckForType() || rowData.isNew) {
        conditionallyDisabled.push('checked');
      }

      if (!canVerifyForType() || rowData.isNew) {
        conditionallyDisabled.push('verified');
      }

      return [...alwaysDisabled, ...conditionallyDisabled];
    },
    [type, measurementPermissions]
  );

  // Handler to copy selected rows
  const handleCopyRows = React.useCallback(() => {
    if (selectedRows.length === 0) return;

    // Copy rows with excludeFromCopy pattern (exclude: id, date, checked, verified)
    const copiedData = selectedRows.map((row) => {
      // Create a copy and remove excluded fields
      const rowCopy = { ...row };
      // Use type assertion to allow deletion of required properties for the copy
      const rest = rowCopy as Partial<ItemMeasurmentRowData>;
      delete rest.id;
      delete rest.date;
      delete rest.checked;
      delete rest.verified;

      return {
        ...rest,
        // Ensure these fields are reset for new rows
        id: '', // Will be generated on paste
        date: '',
        checked: 'false',
        verified: 'false',
        isNew: false, // Will be set to true on paste
        isEdited: false, // Will be set to true on paste
      } as ItemMeasurmentRowData;
    });

    // Store original row IDs for visual indication
    const originalRowIds = selectedRows.map((row) => row.id);
    setCopiedRows(copiedData, projectItemHashId, originalRowIds);
    toast.success(`Copied ${selectedRows.length} row(s)`);
  }, [selectedRows, projectItemHashId, setCopiedRows]);

  // Handler to paste copied rows
  const handlePasteRows = React.useCallback(() => {
    if (!hasCopiedRows() || !sheetTable.table.options.meta?.addRow) return;

    // Check if there's an empty row at the end (isNew: true, isEdited: false) and delete it
    const allRows = sheetTable.data;
    if (allRows.length > 0) {
      const lastRow = allRows[allRows.length - 1] as ItemMeasurmentRowData;
      if (lastRow.isNew === true && lastRow.isEdited === false) {
        sheetTable.deleteRow(lastRow.id);
      }
    }

    const rowsToPaste = copiedRows.map((row) => {
      // Create new row with unique ID and current item's rate/scheduleQuantity
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newRow: ItemMeasurmentRowData = {
        ...row,
        id: newId,
        rate: rate, // Use current item's rate
        schedule_quantity: scheduleQuantity, // Use current item's scheduleQuantity
        isNew: true,
        isEdited: true,
        date: '',
        checked: 'false',
        verified: 'false',
      };

      // Recalculate quantity based on the copied dimensions
      newRow.quantity = calculateQuantity(newRow) ?? 0;

      return newRow;
    });

    // Add all rows at the end
    const addRowFn = sheetTable.table.options.meta?.addRow;
    if (addRowFn) {
      rowsToPaste.forEach((row) => {
        const emptyOriginal = createNewRow(row.headerKey);
        (
          addRowFn as (
            rowData: ItemMeasurmentRowData,
            index?: number,
            originalRow?: { original: ItemMeasurmentRowData }
          ) => void
        )(row, undefined, {
          original: emptyOriginal,
        });
      });
    }
  }, [
    createNewRow,
    sheetTable,
    copiedRows,
    hasCopiedRows,
    rate,
    scheduleQuantity,
  ]);

  // Handler to clear copied rows
  const handleClearCopy = React.useCallback(() => {
    clearCopiedRows();
    toast.success('Copied rows cleared');
  }, [clearCopiedRows]);

  // State for tracking reorder in progress
  const [isReordering, setIsReordering] = React.useState(false);

  /**
   * Calculate new orderKey based on surrounding items
   * Respects boundaries when in segmented view
   * - If dropped at start: firstOrderKey - 1000 (can go negative, but respects lower bound)
   * - If dropped at end: lastOrderKey + 1000 (respects upper bound)
   * - If dropped between: (previousOrderKey + nextOrderKey) / 2
   */
  const calculateNewOrderKey = React.useCallback(
    (
      activeIndex: number,
      overIndex: number,
      currentData: ItemMeasurmentRowData[]
    ): number => {
      // Filter out unsaved rows and the currently dragged row for orderKey calculation
      const draggedRowId = currentData[activeIndex]?.id;
      const savedRows = currentData.filter(
        (row) => !row.isNew && row.id !== draggedRowId
      );

      if (savedRows.length === 0) {
        // No saved rows, use boundaries if available
        if (calculatedBoundaries.lower !== undefined) {
          return calculatedBoundaries.lower + 1000;
        }
        return 1000; // Start from 1000 for the first item
      }

      // Determine the target position in the saved rows
      const targetIndex = overIndex;
      let calculatedKey: number;

      if (targetIndex === 0) {
        // Dropped at the start - subtract 1000 from first item's orderKey
        // This allows negative orderKeys which is fine for sorting
        const firstOrderKey = savedRows[0]?.orderKey ?? 1000;
        calculatedKey = firstOrderKey - 1000;

        // Respect lower bound if it exists
        if (calculatedBoundaries.lower !== undefined) {
          calculatedKey = Math.max(
            calculatedKey,
            calculatedBoundaries.lower + 1
          );
        }
      } else if (targetIndex >= savedRows.length) {
        // Dropped at the end
        const lastOrderKey =
          savedRows[savedRows.length - 1]?.orderKey ??
          (savedRows.length - 1) * 1000;
        calculatedKey = lastOrderKey + 1000;

        // Respect upper bound if it exists
        if (calculatedBoundaries.upper !== undefined) {
          calculatedKey = Math.min(
            calculatedKey,
            calculatedBoundaries.upper - 1
          );
        }
      } else {
        // Dropped between two items
        // We need to consider if we're moving up or down
        let prevIndex = targetIndex - 1;
        let nextIndex = targetIndex;

        // If moving down, the item at overIndex will shift up
        if (activeIndex < overIndex) {
          prevIndex = targetIndex;
          nextIndex = targetIndex + 1;
        }

        // Clamp indices to valid range
        prevIndex = Math.max(0, Math.min(prevIndex, savedRows.length - 1));
        nextIndex = Math.max(0, Math.min(nextIndex, savedRows.length - 1));

        const prevOrderKey = savedRows[prevIndex]?.orderKey ?? prevIndex * 1000;
        const nextOrderKey =
          savedRows[nextIndex]?.orderKey ?? (nextIndex + 1) * 1000;

        calculatedKey = (prevOrderKey + nextOrderKey) / 2;

        // Ensure calculated key respects boundaries
        if (
          calculatedBoundaries.lower !== undefined &&
          calculatedKey < calculatedBoundaries.lower
        ) {
          calculatedKey = calculatedBoundaries.lower + 1;
        }
        if (
          calculatedBoundaries.upper !== undefined &&
          calculatedKey > calculatedBoundaries.upper
        ) {
          calculatedKey = calculatedBoundaries.upper - 1;
        }
      }

      return calculatedKey;
    },
    [calculatedBoundaries]
  );

  /**
   * Handle drag end event for row reordering
   */
  const handleDragEnd = React.useCallback(
    async (activeId: string, overId: string) => {
      if (activeId === overId || isReordering) return;

      const currentData = sheetTable.data as ItemMeasurmentRowData[];
      const activeIndex = currentData.findIndex((row) => row.id === activeId);
      const overIndex = currentData.findIndex((row) => row.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const activeRow = currentData[activeIndex];

      // Don't allow reordering of unsaved rows
      if (activeRow.isNew) {
        toast.error('Please save the row before reordering');
        return;
      }

      // Calculate new orderKey
      const newOrderKey = calculateNewOrderKey(
        activeIndex,
        overIndex,
        currentData
      );

      setIsReordering(true);

      // Optimistically update the local data order
      sheetTable.reorderRows(activeIndex, overIndex);

      // Call API to persist the new order with boundaries
      const result = await handleReorder(activeRow, newOrderKey, {
        orderKeyBoundaries: calculatedBoundaries,
      });

      if (!result.success) {
        // Revert the optimistic update on failure
        sheetTable.reorderRows(overIndex, activeIndex);
      }

      setIsReordering(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheetTable, handleReorder, calculateNewOrderKey, isReordering]
  );

  // Get row IDs for DnD context
  const rowIds = React.useMemo(() => {
    return sheetTable.data.map((row) => row.id);
  }, [sheetTable.data]);

  return {
    sheetTable,
    columns,
    isLoading,
    isError,
    totalAmount,
    totalQuantity,
    editedRowsCount,
    isSavingAll,
    handleSaveAll,
    handleSave, // Exposed for shortcut
    selectedRows,
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    isDeleting,
    deleteError,
    handleBulkDeleteClick,
    confirmBulkDelete,
    showImportDialog,
    setShowImportDialog,
    handleImportFromMeasurement,
    createNewRow,
    getDisabledColumns,
    handleCopyRows,
    handlePasteRows,
    handleClearCopy,
    handleDiscardAll,
    hasCopiedRows: hasCopiedRows(),
    isFromSameItem: sourceItemId === projectItemHashId,
    // Drag and drop
    handleDragEnd,
    rowIds,
    isReordering,
    // Segment filtering
    orderKeyBoundaries: calculatedBoundaries,
  };
}
