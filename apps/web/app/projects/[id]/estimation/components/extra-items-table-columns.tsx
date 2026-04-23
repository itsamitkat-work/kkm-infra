'use client';

import React from 'react';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { EstimationRowData } from '../types';
import { projectItemZodSchema } from '@/types/project-item';
import {
  MasterItemEditorConfig,
  type MasterItemEditorConfigType,
} from '@/app/projects/[id]/items/MasterItemEditorConfig';
import type { MasterItemOption } from '@/app/projects/[id]/components/master-item-options';
import { getSelectedMasterItem } from '@/app/projects/[id]/items/use-master-item-selection';
import { buildPatchFromSelection } from '../../utils';
import { SaveButton } from '@/components/ui/save-button';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';

interface ExtraItemsColumnProps {
  onItemRemove: (itemId: string) => void;
  onItemDuplicate?: (item: EstimationRowData) => void;
  onSave: (item: EstimationRowData) => void;
  itemErrors: Record<string, string | null>;
  savingItemIds: Record<string, boolean>;
}

// Create the onChangeUpdateRow function for master item selection
function createMasterItemOnChangeUpdateRow() {
  return ({ draftRow }: { draftRow: EstimationRowData }) => {
    const rowId = String(draftRow.id);
    const selectedMasterItem = getSelectedMasterItem(rowId);

    if (!selectedMasterItem) {
      return { is_edited: true };
    }

    // Build and return the patch to update all related fields
    const patch = buildPatchFromSelection(selectedMasterItem);
    return { ...patch, is_edited: true };
  };
}

const masterItemOnChangeUpdateRow = createMasterItemOnChangeUpdateRow();

// Config for code column
const codeColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Code',
  searchPlaceholder: 'Search by code',
  searchField: 'code',
  getOptionLabel: (option: MasterItemOption) => option.code,
  renderSelectedValue: (
    option: MasterItemOption | null,
    placeholder: string,
    rowValue?: string
  ) => option?.code || rowValue || placeholder,
  getOnChangeValue: (option: MasterItemOption | null) => option?.code ?? '',
  getRowValue: (row: EstimationRowData) => row.item_code ?? '',
};

// Config for name column
const nameColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Item',
  searchPlaceholder: 'Search by name',
  searchField: 'name',
  renderSelectedValue: (
    option: MasterItemOption | null,
    placeholder: string,
    rowValue?: string
  ) => option?.name || rowValue || placeholder,
  getOnChangeValue: (option: MasterItemOption | null) => option?.name ?? '',
  getOptionLabel: (option: MasterItemOption) => option.name,
  getRowValue: (row: EstimationRowData) => row.item_description ?? '',
};

export const getExtraItemsColumns = ({
  onItemRemove,
  onItemDuplicate,
  onSave,
  itemErrors,
  savingItemIds,
}: ExtraItemsColumnProps): ExtendedColumnDef<EstimationRowData>[] => {
  return [
    {
      accessorKey: 'work_order_number',
      header: 'Wo. No.',
      inputType: 'input',
      validationSchema: projectItemZodSchema.shape.work_order_number,
      size: 80,
    },
    {
      accessorKey: 'item_code',
      header: 'Code',
      validationSchema: projectItemZodSchema.shape.item_code,
      size: 120,
      inputType: 'combobox' as const,
      editor: (props) => (
        <MasterItemEditorConfig
          row={props.rowData}
          onChange={props.onChange}
          autoFocus={props.autoFocus}
          config={codeColumnConfig}
        />
      ),
      onChangeUpdateRow: masterItemOnChangeUpdateRow,
    },
    {
      accessorKey: 'reference_schedule_text',
      header: 'Reference Schedule',
      inputType: 'input',
      className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
      validationSchema: projectItemZodSchema.shape.reference_schedule_text,
      size: 120,
      // DSR Code is auto-filled, so we disable editing
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className='px-2 py-1 text-center text-muted-foreground bg-muted'>
            {value || ''}
          </div>
        );
      },
    },
    {
      accessorKey: 'schedule_name',
      header: 'Schedule',
      inputType: 'input',
      className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
      validationSchema: projectItemZodSchema.shape.schedule_name,
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className='px-2 py-1 text-center bg-muted text-muted-foreground'>
            {value || ''}
          </div>
        );
      },
    },
    {
      accessorKey: 'item_description',
      header: 'Name',
      validationSchema: projectItemZodSchema.shape.item_description,
      size: 250,
      minSize: 200,
      maxSize: 400,
      inputType: 'combobox' as const,
      editor: (props) => (
        <MasterItemEditorConfig
          row={props.rowData}
          onChange={props.onChange}
          autoFocus={props.autoFocus}
          config={nameColumnConfig}
        />
      ),
      onChangeUpdateRow: masterItemOnChangeUpdateRow,
    },
    {
      accessorKey: 'rate_amount',
      header: 'Rate',
      inputType: 'input',
      validationSchema: projectItemZodSchema.shape.rate_amount,
      size: 100,
      onChangeUpdateRow: ({ draftRow, newValue }) => {
        return {
          ...draftRow,
          rate_amount: newValue as string,
          is_edited: true,
        };
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const isSaveDisabled = !item.is_edited && !item.is_new;
        const isSaving = Boolean(savingItemIds[item.id]);
        const errorMessage = itemErrors[item.id] ?? null;

        const handleSave = () => {
          if (isSaving) return;
          onSave(item);
        };

        return (
          <div className='flex items-center justify-center gap-1 px-2'>
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
              title='Delete'
            >
              <Trash2 className='h-4 w-4 text-destructive' />
            </Button>
          </div>
        );
      },
    },
  ];
};
