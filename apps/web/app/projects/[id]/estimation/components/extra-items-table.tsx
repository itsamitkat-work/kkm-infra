'use client';

import React, { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import SheetTable from '@/components/tables/sheet-table/sheet-table';
import { useSheetTable } from '@/components/tables/sheet-table/hooks/use-sheet-table';
import { cn } from '@/lib/utils';
import { EstimationRowData, ProjectItemType } from '../types';
import { getExtraItemsColumns } from './extra-items-table-columns';
import { projectItemZodSchema } from '@/types/project-item';
import { useExtraItemsStore } from '../hooks/use-extra-items-store';
import {
  useCreateProjectItem,
  useUpdateProjectItem,
} from '@/hooks/projects/use-project-items-mutations';
import { parseNumber } from '@/lib/utils';
import { toast } from 'sonner';

interface ExtraItemsTableProps {
  projectId: string;
  type: ProjectItemType;
  onItemSaved?: () => void; // Callback when an item is successfully saved
}

export interface ExtraItemsTableRef {
  addNewItem: () => void;
  duplicateItem: (item: EstimationRowData) => void;
}

export const ExtraItemsTable = forwardRef<
  ExtraItemsTableRef,
  ExtraItemsTableProps
>(({ projectId, type, onItemSaved }, ref) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  // Use the store directly in this component
  const {
    extraItems: data,
    itemErrors,
    savingItemIds,
    addExtraItem,
    updateExtraItem,
    removeExtraItem,
    setItemError,
    setSavingItem,
  } = useExtraItemsStore();

  const { mutateAsync: createItem } = useCreateProjectItem(projectId);
  const { mutateAsync: updateItem } = useUpdateProjectItem(projectId);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addNewItem: () => {
      const newItem: EstimationRowData = {
        id: `extra-${Date.now()}`,
        work_order_number: '',
        schedule_item_id: '',
        item_description: '',
        item_code: '',
        reference_schedule_text: '',
        unit_display: '',
        rate_amount: '',
        contract_quantity: '0',
        project_segment_ids: [],
        estimate_quantity: '0',
        measurment_quantity: '0',
        deviationQty: 0,
        deviationPercent: 0,
        costDeviation: 0,
        is_new: true,
        is_edited: true,
      };
      addExtraItem(newItem);
    },
    duplicateItem: (itemToDuplicate: EstimationRowData) => {
      const newItem: EstimationRowData = {
        ...itemToDuplicate,
        id: `extra-${Date.now()}`,
        work_order_number: '',
        is_new: true,
        is_edited: true,
      };
      addExtraItem(newItem);
    },
  }));

  // Handle item save
  const handleSave = React.useCallback(
    async (item: EstimationRowData) => {
      setSavingItem(item.id, true);
      setItemError(item.id, null);

      // Validate item data against zod schema
      const validationResult = projectItemZodSchema.safeParse(item);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => issue.message)
          .join(', ');
        setItemError(item.id, errorMessage);
        setSavingItem(item.id, false);
        toast.error(errorMessage);
        return;
      }

      const updatePayload = {
        project_id: projectId,
        rate_amount: parseNumber(item.rate_amount),
        contract_quantity: 0,
        remark: item.remark ?? null,
        work_order_number: item.work_order_number,
        item_code: item.item_code,
        item_description: item.item_description,
        unit_display: item.unit_display,
        reference_schedule_text: item.reference_schedule_text ?? '',
        project_segment_ids: item.project_segment_ids ?? [],
      };

      const createPayload = {
        project_id: projectId,
        schedule_item_id: String(item.schedule_item_id ?? ''),
        work_order_number: String(item.work_order_number ?? ''),
        item_code: item.item_code ?? '',
        item_description: item.item_description ?? '',
        unit_display: item.unit_display ?? '',
        rate_amount: parseNumber(item.rate_amount),
        contract_quantity: parseNumber(item.contract_quantity),
        remark: item.remark ?? null,
        reference_schedule_text: item.reference_schedule_text ?? '',
        project_segment_ids: item.project_segment_ids ?? [],
        type,
      };

      try {
        if (!item.is_new) {
          await updateItem({
            ...updatePayload,
            id: item.id,
          });
          updateExtraItem({ ...item, is_edited: false });
          setItemError(item.id, null);
          onItemSaved?.();
        } else {
          const result = await createItem(createPayload);
          if (result?.data?.id) {
            removeExtraItem(item.id);
            setItemError(item.id, null);
            onItemSaved?.();
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'An error occurred while saving the item.';
        setItemError(item.id, message);
        toast.error(message);
      } finally {
        setSavingItem(item.id, false);
      }
    },
    [
      createItem,
      projectId,
      removeExtraItem,
      setItemError,
      setSavingItem,
      type,
      updateExtraItem,
      updateItem,
      onItemSaved,
    ]
  );

  // Handle item change

  // Handle item remove
  const handleItemRemove = React.useCallback(
    (itemId: string) => {
      removeExtraItem(itemId);
    },
    [removeExtraItem]
  );

  // Use a ref to store the addRow function so we can use it in handleItemDuplicate
  const addRowRef = React.useRef<((newRow: EstimationRowData) => void) | null>(
    null
  );

  // Handle item duplicate - defined before columns but will use ref for addRow
  const handleItemDuplicate = React.useCallback(
    (item: EstimationRowData) => {
      // Create a clean duplicate without internal table fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _original, header_key, ...itemWithoutInternal } =
        item as EstimationRowData & {
          _original?: unknown;
          header_key?: string | null;
        };
      const newItem: EstimationRowData = {
        ...itemWithoutInternal,
        id: `extra-${Date.now()}`,
        work_order_number: '',
        is_new: true,
        is_edited: true,
      };
      // Add to store
      addExtraItem(newItem);
      // Also add to table's internal state so it appears immediately
      if (addRowRef.current) {
        addRowRef.current(newItem);
      }
    },
    [addExtraItem]
  );

  const columns = useMemo(
    () =>
      getExtraItemsColumns({
        onItemRemove: handleItemRemove,
        onItemDuplicate: handleItemDuplicate,
        onSave: handleSave,
        itemErrors,
        savingItemIds,
      }),
    [
      handleItemRemove,
      handleItemDuplicate,
      handleSave,
      itemErrors,
      savingItemIds,
    ]
  );

  const searchKeys = useMemo(
    () => ['item_description', 'item_code', 'work_order_number'],
    []
  );
  const filters = useMemo(() => [], []);

  const sheetTable = useSheetTable<EstimationRowData>({
    columns: columns,
    data: data,
    enableColumnSizing: true,
    filters: filters,
    searchKeys: searchKeys,
    rowDataZodSchema: projectItemZodSchema,
  });

  // Store the addRow function in the ref
  React.useEffect(() => {
    addRowRef.current = (newRow: EstimationRowData) => {
      sheetTable.addRow(newRow);
    };
  }, [sheetTable]);

  // Handle save shortcut for each row
  React.useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const activeElement = document.activeElement;
        if (activeElement) {
          const rowElement = activeElement.closest('[data-row-id]');
          if (rowElement) {
            const rowId = rowElement.getAttribute('data-row-id');
            if (rowId) {
              // Get item from table data (source of truth for edited data)
              const item = sheetTable.data.find((item) => item.id === rowId);
              if (item && (item.is_edited || item.is_new)) {
                e.preventDefault();
                handleSave(item as EstimationRowData);
              }
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleSaveShortcut);
    return () => {
      document.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [sheetTable.data, handleSave]);

  const searchConfig = React.useMemo(
    () => ({
      enabled: true,
      placeholder: 'Search extra items...',
      variant: 'sm' as const,
    }),
    []
  );

  // Disable editing for actions column
  const getDisabledColumns = React.useCallback(() => {
    return ['schedule_name', 'reference_schedule_text', 'actions'] as string[];
  }, []);

  // Memoize onEdit to prevent infinite loops
  // Use editCell directly to avoid depending on the entire sheetTable object
  const handleEdit = React.useCallback(
    (rowId: string, columnId: string | number, value: unknown) => {
      sheetTable.editCell(rowId, String(columnId), value);
      // Don't sync here - let the table manage its own state
      // We'll sync when saving or when explicitly needed
    },
    [sheetTable]
  );

  return (
    <TooltipProvider>
      <div
        ref={tableContainerRef}
        className={cn(
          'rounded-md border overflow-hidden relative',
          'transition-all duration-300 ease-in-out'
        )}
      >
        <SheetTable<EstimationRowData>
          id='extra-items-table'
          columns={columns}
          sheetTable={sheetTable}
          onEdit={handleEdit}
          disabledColumns={getDisabledColumns}
          searchConfig={searchConfig}
          enableColumnSizing={true}
          dense={true}
          containerClassName='h-full overflow-y-auto text-xs'
          excludeFromCopy={['id', 'select', 'actions']}
          enableFormulaMode={false}
        />
      </div>
    </TooltipProvider>
  );
});

ExtraItemsTable.displayName = 'ExtraItemsTable';
