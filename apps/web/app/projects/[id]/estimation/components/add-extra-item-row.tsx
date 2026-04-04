'use client';

import React, { useCallback, useMemo } from 'react';
import {
  MasterItemOption,
  renderMasterItemOption,
  useMasterItemOptions,
} from '@/app/projects/[id]/components/master-item-options';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SaveButton } from '@/components/ui/save-button';
import { Copy, Trash2 } from 'lucide-react';
import { ProjectItemType } from '../types';
import { CellEditor } from '@/components/tables/sheet-table/cell-editor';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { MasterItem } from '@/hooks/items/types';
import { projectItemZodSchema } from '@/types/project-item';
import { ProjectItemRowType as EstimationRowData } from '@/types/project-item';
import { buildPatchFromSelection } from '../../utils';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';

interface AddExtraItemProps {
  item: EstimationRowData;
  index: number;
  onItemChange: (item: EstimationRowData) => void;
  onItemRemove: (itemId: string) => void;
  onItemDuplicate?: (item: EstimationRowData) => void;
  onSave: (item: EstimationRowData) => void;
  type: ProjectItemType;
  rowClassName: string;
  masterProjectItems: MasterItem[];
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
  masterProjectItems,
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
  const masterItemOptions = useMasterItemOptions(masterProjectItems);
  const rowRef = React.useRef<HTMLTableRowElement | null>(null);
  const errorMessage = error ?? null;
  const isSaveDisabled = !item.isEdited && !item.isNew;
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
    Record<keyof EstimationRowData, ExtendedColumnDef<EstimationRowData>>
  > = useMemo(
    () => ({
      srNo: {
        accessorKey: 'srNo',
        header: 'Wo. No.',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.srNo,
      },
      code: {
        accessorKey: 'code',
        header: 'Code',
        inputType: 'combobox',
        inputConfig: {
          options: masterItemOptions,
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
            const itemOption = option as MasterItemOption;
            return itemOption.code || itemOption.hashId;
          },
          getOptionLabel: (option) => {
            const itemOption = option as MasterItemOption;
            return itemOption.code || itemOption.name;
          },
          renderOption: (option, context) =>
            renderMasterItemOption({
              option: option as MasterItemOption,
              label:
                (option as MasterItemOption).code ||
                (option as MasterItemOption).name ||
                '',
              isSelected: context.isSelected,
              searchValue: context.searchValue,
            }),
          renderSelectedValue: (option, rowData) => {
            if (!option)
              return rowData.code ? (
                <span className='truncate'>{rowData.code}</span>
              ) : (
                <span className='text-muted-foreground'>Code</span>
              );

            const selected = option as MasterItemOption;
            return (
              <span className='truncate'>
                {selected.code || selected.name || rowData.code || 'Code'}
              </span>
            );
          },
        },
        validationSchema: projectItemZodSchema.shape.code,
      },
      dsrCode: {
        accessorKey: 'dsrCode',
        header: 'DSR Code',
        inputType: 'input',
        className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
        validationSchema: projectItemZodSchema.shape.dsrCode,
      },
      name: {
        accessorKey: 'name',
        header: 'Name',
        inputType: 'combobox',
        inputConfig: {
          options: masterItemOptions,
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
            const itemOption = option as MasterItemOption;
            return itemOption.name || itemOption.code;
          },
          getOptionLabel: (option) => {
            const itemOption = option as MasterItemOption;
            return itemOption.name || itemOption.code;
          },
          renderOption: (option, context) =>
            renderMasterItemOption({
              option: option as MasterItemOption,
              label:
                (option as MasterItemOption).name ||
                (option as MasterItemOption).code ||
                '',
              isSelected: context.isSelected,
              searchValue: context.searchValue,
            }),
          renderSelectedValue: (option, rowData) => {
            if (!option)
              return rowData.name ? (
                <span className='truncate'>{rowData.name}</span>
              ) : (
                <span className='text-muted-foreground'>Item</span>
              );

            const selected = option as MasterItemOption;
            return (
              <span className='truncate'>
                {selected.name || selected.code || rowData.name || 'Item'}
              </span>
            );
          },
        },
        validationSchema: projectItemZodSchema.shape.name,
      },
      quantity: {
        accessorKey: 'quantity',
        header: type === 'MSR' ? 'Estimated Qty' : 'Planned Qty',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.quantity,
        className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
      },
      rate: {
        accessorKey: 'rate',
        header: 'Rate',
        inputType: 'input',
        validationSchema: projectItemZodSchema.shape.rate,
      },
    }),
    [
      hasMore,
      loading,
      masterItemOptions,
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
    (field: keyof EstimationRowData, value: string) => {
      const updatedItem = { ...item, [field]: value };

      if (field === 'code' || field === 'name') {
        const matchedMasterItem = masterProjectItems.find((masterItem) => {
          if (field === 'code') {
            return masterItem.code === value;
          }

          return masterItem.name === value;
        });

        const patch = buildPatchFromSelection(matchedMasterItem);
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
    [item, onItemChange, masterProjectItems]
  );

  const renderCell = (name: keyof EstimationRowData) => {
    const colDef = columnDefs[name];
    if (!colDef) return <TableCell className='border-r p-0'></TableCell>;

    return (
      <TableCell
        className={cn(
          `border-r p-0 ${name === 'name' ? 'max-w-[300px]' : ''}`,
          {
            'bg-muted': name === 'quantity' || name === 'dsrCode',
          }
        )}
      >
        <CellEditor
          colDef={colDef}
          rowData={item}
          value={String(
            item[colDef.accessorKey as keyof EstimationRowData] ?? ''
          )}
          onValueChange={(value) =>
            handleChange(colDef.accessorKey as keyof EstimationRowData, value)
          }
          enableEditing={true}
          disabled={name === 'quantity' || name === 'dsrCode'}
        />
      </TableCell>
    );
  };

  return (
    <TableRow ref={rowRef} className={rowClassName}>
      {renderCell('srNo')}
      {renderCell('code')}
      {renderCell('dsrCode')}
      {renderCell('name')}
      {renderCell('quantity')}
      {renderCell('rate')}
      <TableCell className='text-center flex items-center justify-center gap-1'>
        <SaveButton
          onClick={handleSave}
          disabled={isSaveDisabled || isSaving}
          isLoading={isSaving}
          errorMessage={errorMessage}
          isNew={!!item.isNew}
          isEdited={!!item.isEdited}
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
