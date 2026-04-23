'use client';

import React, { useCallback, useMemo } from 'react';
import type { BoqSchedulePick } from '@/app/(app)/schedule-items/boq-schedule-pick';
import {
  type ScheduleItemPickerOption,
  renderScheduleItemPickerOption,
  useScheduleItemPickerOptions,
} from '@/app/(app)/schedule-items/schedule-item-picker-option';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SaveButton } from '@/components/ui/save-button';
import { Copy, Trash2 } from 'lucide-react';
import type { ProjectBoqDomainLinesType } from '../types';
import { CellEditor } from '@/components/tables/sheet-table/cell-editor';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { projectItemZodSchema } from '@/types/project-item';
import { ProjectItemRowType as EstimationRowData } from '@/types/project-item';
import { buildPatchFromSchedulePick } from '../../utils';
import { cn } from '@/lib/utils';
import {
  flattenItemDescription,
  itemDescriptionFromPlainText,
} from '@/app/(app)/schedule-items/item-description-doc';
import { ItemDescriptionHierarchy } from '@/app/(app)/schedule-items/item-description-hierarchy';
import { useHotkeys } from 'react-hotkeys-hook';

type AddExtraEditableKey =
  | 'work_order_number'
  | 'item_code'
  | 'reference_schedule_text'
  | 'item_description'
  | 'contract_quantity'
  | 'rate_amount';

interface AddExtraItemProps {
  item: EstimationRowData;
  index: number;
  onItemChange: (item: EstimationRowData) => void;
  onItemRemove: (itemId: string) => void;
  onItemDuplicate?: (item: EstimationRowData) => void;
  onSave: (item: EstimationRowData) => void;
  type: ProjectBoqDomainLinesType;
  rowClassName: string;
  scheduleCatalogPicks: BoqSchedulePick[];
  onSearch: (query: string, field: string) => void;
  onLoadMore: () => void;
  hasMore?: boolean;
  loading?: boolean;
  error?: string;
  scheduleFilterOptions?: { id: string; label: string }[];
  scheduleFilterValue?: string | null;
  onScheduleFilterChange?: (value: string | null) => void;
  scheduleFilterPlaceholder?: string;
  isSaving?: boolean;
}

export function AddExtraItemRow({
  type,
  item,
  onItemChange,
  onItemRemove,
  onItemDuplicate,
  onSave,
  rowClassName,
  scheduleCatalogPicks,
  onSearch,
  onLoadMore,
  hasMore,
  loading,
  error,
  scheduleFilterOptions,
  scheduleFilterValue,
  onScheduleFilterChange,
  scheduleFilterPlaceholder,
  isSaving: isSavingProp = false,
}: AddExtraItemProps) {
  const schedulePickerOptions = useScheduleItemPickerOptions(scheduleCatalogPicks);
  const rowRef = React.useRef<HTMLTableRowElement | null>(null);
  const errorMessage = error ?? null;
  const isSaveDisabled = !item.is_edited && !item.is_new;
  const isSaving = Boolean(isSavingProp);

  const handleSave = useCallback(() => {
    if (isSaving) return;
    onSave(item);
  }, [isSaving, item, onSave]);

  useHotkeys(
    'ctrl+s, meta+s',
    (event) => {
      if (!rowRef.current) return;
      const activeElement = document.activeElement;
      if (activeElement && rowRef.current.contains(activeElement)) {
        if (isSaveDisabled || isSaving) {
          return;
        }
        event.preventDefault();
        handleSave();
      }
    },
    {
      enableOnFormTags: true,
    },
    [handleSave, isSaveDisabled, isSaving]
  );

  const columnDefs: Partial<
    Record<AddExtraEditableKey, ExtendedColumnDef<EstimationRowData>>
  > = useMemo(
    () => ({
      work_order_number: {
        accessorKey: 'work_order_number',
        header: 'Wo. No.',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.work_order_number,
      },
      item_code: {
        accessorKey: 'item_code',
        header: 'Code',
        inputType: 'combobox',
        inputConfig: {
          options: schedulePickerOptions,
          onSearch: (query) => onSearch(query, 'code'),
          onLoadMore,
          hasMore,
          loading,
          searchPlaceholder: 'Search by code',
          filterOptions: scheduleFilterOptions,
          filterValue: scheduleFilterValue ?? null,
          filterPlaceholder: scheduleFilterPlaceholder ?? 'Schedule',
          onFilterChange: onScheduleFilterChange,
          getOptionId: (option) => {
            const itemOption = option as ScheduleItemPickerOption;
            return itemOption.code || itemOption.hashId;
          },
          getOptionLabel: (option) => {
            const itemOption = option as ScheduleItemPickerOption;
            return itemOption.code || itemOption.name;
          },
          renderOption: (option, context) =>
            renderScheduleItemPickerOption({
              option: option as ScheduleItemPickerOption,
              label:
                (option as ScheduleItemPickerOption).code ||
                (option as ScheduleItemPickerOption).name ||
                '',
              isSelected: context.isSelected,
              searchValue: context.searchValue,
            }),
          renderSelectedValue: (option, rowData) => {
            if (!option)
              return rowData.item_code ? (
                <span className='truncate'>{rowData.item_code}</span>
              ) : (
                <span className='text-muted-foreground'>Code</span>
              );

            const selected = option as ScheduleItemPickerOption;
            return (
              <span className='truncate'>
                {selected.code ||
                  selected.name ||
                  rowData.item_code ||
                  'Code'}
              </span>
            );
          },
        },
        validationSchema: projectItemZodSchema.shape.item_code,
      },
      reference_schedule_text: {
        accessorKey: 'reference_schedule_text',
        header: 'DSR Code',
        inputType: 'input',
        className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
        validationSchema: projectItemZodSchema.shape.reference_schedule_text,
      },
      item_description: {
        accessorKey: 'item_description',
        header: 'Name',
        inputType: 'combobox',
        inputConfig: {
          options: schedulePickerOptions,
          onSearch: (query) => onSearch(query, 'name'),
          onLoadMore,
          hasMore,
          loading,
          searchPlaceholder: 'Search by name',
          filterOptions: scheduleFilterOptions,
          filterValue: scheduleFilterValue ?? null,
          filterPlaceholder: scheduleFilterPlaceholder ?? 'Schedule',
          onFilterChange: onScheduleFilterChange,
          getOptionId: (option) => {
            const itemOption = option as ScheduleItemPickerOption;
            return itemOption.name || itemOption.code;
          },
          getOptionLabel: (option) => {
            const itemOption = option as ScheduleItemPickerOption;
            return itemOption.name || itemOption.code;
          },
          renderOption: (option, context) =>
            renderScheduleItemPickerOption({
              option: option as ScheduleItemPickerOption,
              label:
                (option as ScheduleItemPickerOption).name ||
                (option as ScheduleItemPickerOption).code ||
                '',
              isSelected: context.isSelected,
              searchValue: context.searchValue,
            }),
          renderSelectedValue: (option, rowData) => {
            if (!option) {
              if (flattenItemDescription(rowData.item_description).trim() !== '') {
                return (
                  <span className='truncate'>
                    <ItemDescriptionHierarchy doc={rowData.item_description} />
                  </span>
                );
              }
              return <span className='text-muted-foreground'>Item</span>;
            }

            const selected = option as ScheduleItemPickerOption;
            return (
              <span className='truncate'>
                {selected.name ||
                  selected.code ||
                  flattenItemDescription(rowData.item_description) ||
                  'Item'}
              </span>
            );
          },
        },
        validationSchema: projectItemZodSchema.shape.item_description,
      },
      contract_quantity: {
        accessorKey: 'contract_quantity',
        header:
          type === 'measurement' || type === 'billing'
            ? 'Estimated Qty'
            : 'Planned Qty',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.contract_quantity,
        className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
      },
      rate_amount: {
        accessorKey: 'rate_amount',
        header: 'Rate',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.rate_amount,
      },
    }),
    [
      hasMore,
      loading,
      schedulePickerOptions,
      onLoadMore,
      onSearch,
      onScheduleFilterChange,
      scheduleFilterOptions,
      scheduleFilterPlaceholder,
      scheduleFilterValue,
      type,
    ]
  );

  const handleChange = useCallback(
    (field: AddExtraEditableKey, value: unknown) => {
      let normalized: unknown = value;
      if (field === 'item_description' && typeof value === 'string') {
        normalized = itemDescriptionFromPlainText(value);
      }
      const updatedItem = {
        ...item,
        [field]: normalized,
      } as EstimationRowData;

      if (field === 'item_code' || field === 'item_description') {
        const matchKey = typeof value === 'string' ? value : '';
        const matchedPick = scheduleCatalogPicks.find((pick) => {
          if (field === 'item_code') {
            return pick.treeRow.code === matchKey;
          }

          return (
            pick.treeRow.description === matchKey ||
            flattenItemDescription(pick.itemDescriptionDoc) === matchKey
          );
        });

        const patch =
          matchedPick != null ? buildPatchFromSchedulePick(matchedPick) : null;
        if (patch) {
          onItemChange({
            ...updatedItem,
            ...patch,
          });
          return;
        }
      }
      onItemChange(updatedItem);
    },
    [item, onItemChange, scheduleCatalogPicks]
  );

  const renderCell = (name: AddExtraEditableKey) => {
    const colDef = columnDefs[name];
    if (!colDef) return <TableCell className='border-r p-0'></TableCell>;

    return (
      <TableCell
        className={cn(
          `border-r p-0 ${name === 'item_description' ? 'max-w-[300px]' : ''}`,
          {
            'bg-muted':
              name === 'contract_quantity' || name === 'reference_schedule_text',
          }
        )}
      >
        <CellEditor
          colDef={colDef}
          rowData={item}
          value={
            name === 'item_description'
              ? flattenItemDescription(item.item_description)
              : String(
                  item[colDef.accessorKey as keyof EstimationRowData] ?? ''
                )
          }
          onValueChange={(value) =>
            handleChange(colDef.accessorKey as AddExtraEditableKey, value)
          }
          enableEditing={true}
          disabled={
            name === 'contract_quantity' || name === 'reference_schedule_text'
          }
        />
      </TableCell>
    );
  };

  return (
    <TableRow ref={rowRef} className={rowClassName}>
      {renderCell('work_order_number')}
      {renderCell('item_code')}
      {renderCell('reference_schedule_text')}
      {renderCell('item_description')}
      {renderCell('contract_quantity')}
      {renderCell('rate_amount')}
      <TableCell className='text-center flex items-center justify-center gap-1'>
        <SaveButton
          onClick={handleSave}
          disabled={isSaveDisabled || isSaving}
          isLoading={isSaving}
          errorMessage={errorMessage}
          isNew={!!item.is_new}
          isEdited={!!item.is_edited}
        />
        {onItemDuplicate && (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => onItemDuplicate(item)}
            title='Duplicate'
          >
            <Copy className='h-4 w-4' />
          </Button>
        )}
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => onItemRemove(item.id)}
        >
          <Trash2 className='h-4 w-4 text-destructive' />
        </Button>
      </TableCell>
    </TableRow>
  );
}
