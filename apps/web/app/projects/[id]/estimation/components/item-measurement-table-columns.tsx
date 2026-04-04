'use client';

import { ActionsDropdown, ActionItem } from '@/components/ui/actions-dropdown';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { Trash2, X, Copy, ClipboardCheck } from 'lucide-react';
import { TableMeta } from '@tanstack/react-table';
import {
  ItemMeasurmentRowData,
  ProjectItemType,
  rowDataZodSchema,
} from '../types';
import { calculateQuantity } from '../utils';
import React from 'react';
import { Row, Table } from '@tanstack/react-table';
import { SaveButton } from '@/components/ui/save-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type ColumnFactoryProps = {
  handleSave: (
    rowData: ItemMeasurmentRowData,
    meta: TableMeta<ItemMeasurmentRowData>,
    rowIndex?: number
  ) => Promise<void>;
  handleDelete: (
    rowData: ItemMeasurmentRowData,
    meta: TableMeta<ItemMeasurmentRowData>
  ) => Promise<void>;
  saveErrors: Record<string, string | null>;
  type: ProjectItemType;
  createNewRow: (headerKey?: string) => ItemMeasurmentRowData;
  isRowCopied?: (rowId: string) => boolean;
  segmentNames?: string[];
};

const measurementColumns: ExtendedColumnDef<ItemMeasurmentRowData>[] = [
  {
    accessorKey: 'checked',
    header: 'Checked',
    validationSchema: rowDataZodSchema.shape.checked,
    className: 'text-center',
    size: 50,
    minSize: 50,
    maxSize: 50,
    inputType: 'checkbox',
  },
  {
    accessorKey: 'verified',
    header: 'Verified',
    validationSchema: rowDataZodSchema.shape.verified,
    className: 'text-center',
    size: 50,
    minSize: 50,
    maxSize: 50,
    inputType: 'checkbox',
  },
];

export const getColumns = ({
  handleSave,
  handleDelete,
  saveErrors,
  createNewRow,
  type,
  isRowCopied,
  segmentNames = [],
}: ColumnFactoryProps): ExtendedColumnDef<ItemMeasurmentRowData>[] => [
  {
    id: 'select',
    header: ({ table }) => {
      // Use getRowCanSelect to determine which rows can be selected
      const allRows = table.getRowModel().rows;
      const selectableRows = allRows.filter((row) => {
        return row.getCanSelect?.() ?? true;
      });
      const selectedSelectableRows = selectableRows.filter((row) =>
        row.getIsSelected()
      );
      const isAllSelected =
        selectableRows.length > 0 &&
        selectedSelectableRows.length === selectableRows.length;
      const isSomeSelected =
        selectedSelectableRows.length > 0 &&
        selectedSelectableRows.length < selectableRows.length;

      return (
        <div className='flex items-center justify-center h-full w-full'>
          <Checkbox
            checked={
              isAllSelected ? true : isSomeSelected ? 'indeterminate' : false
            }
            onCheckedChange={(value) => {
              // Toggle all selectable rows
              selectableRows.forEach((row) => {
                if (value) {
                  row.toggleSelected(true);
                } else {
                  row.toggleSelected(false);
                }
              });
            }}
            aria-label='Select all'
            className='translate-y-[2px]'
            disabled={selectableRows.length === 0}
          />
        </div>
      );
    },
    cell: ({ row }) => {
      // Use getRowCanSelect to determine if this row can be selected
      const canSelect = row.getCanSelect?.() ?? true;

      return (
        <div className='flex items-center justify-center h-full w-full'>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              if (canSelect) {
                row.toggleSelected(!!value);
              }
            }}
            aria-label='Select row'
            className='translate-y-[2px]'
            disabled={!canSelect}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 32,
    minSize: 32,
    maxSize: 32,
    className: 'text-center',
    // Ensure this column is always rendered directly, not through CellEditor
    editor: undefined,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    validationSchema: rowDataZodSchema.shape.date,
    size: 70,
    minSize: 70,
    maxSize: 70,
    showTooltip: true,
    inputType: 'date',
    className: 'text-muted-foreground',
    inputConfig: {
      placeholder: 'DD/MM/YYYY',
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    validationSchema: rowDataZodSchema.shape.description,
    className: 'text-left',
    size: 300,
    minSize: 200,
    maxSize: 400,
    showTooltip: true,
    inputType: 'textarea',
    inputConfig: {
      placeholder: 'Enter description...',
      minRows: 1,
      maxRows: 2,
      suggestions: segmentNames,
      triggerChar: '#',
      maxSuggestions: 500,
      formatSelectedValue: (suggestion: string) => {
        return `${suggestion}: `;
      },
    },
    // Add a custom formatter to show the badge, but keep the cell editable
    cell: ({ row, getValue }) => {
      const value = getValue() as string;
      const rowData = row.original as ItemMeasurmentRowData;
      const isCopied = isRowCopied ? isRowCopied(rowData.id) : false;

      // Return the value with a wrapper that includes the badge
      // The CellEditor will handle the editing, this is just for display
      return (
        <div className='flex items-center gap-2 w-full h-full'>
          <span className='flex-1 min-w-0'>{value || ''}</span>
          {isCopied && (
            <Badge
              variant='outline'
              className='text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20 shrink-0'
            >
              <ClipboardCheck className='h-3 w-3' />
              Copied
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'no1',
    header: 'No1',
    validationSchema: rowDataZodSchema.shape.no1,
    className: 'text-center text-muted-foreground',
    size: 35,
    minSize: 35,
    maxSize: 35,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'No1',
    },
  },
  {
    accessorKey: 'no2',
    header: 'No2',
    validationSchema: rowDataZodSchema.shape.no2,
    className: 'text-center text-muted-foreground',
    size: 35,
    minSize: 35,
    maxSize: 35,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'No2',
    },
  },
  {
    accessorKey: 'length',
    header: 'Length',
    validationSchema: rowDataZodSchema.shape.length,
    className: 'text-center text-muted-foreground',
    size: 45,
    minSize: 45,
    maxSize: 45,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'Length',
    },
  },
  {
    accessorKey: 'width',
    header: 'Width',
    validationSchema: rowDataZodSchema.shape.width,
    className: 'text-center text-muted-foreground',
    size: 45,
    minSize: 45,
    maxSize: 45,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'Width',
    },
  },
  {
    accessorKey: 'height',
    header: 'Height',
    validationSchema: rowDataZodSchema.shape.height,
    className: 'text-center text-muted-foreground',
    size: 45,
    minSize: 45,
    maxSize: 45,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'Height',
    },
  },

  {
    accessorKey: 'quantity',
    header: 'Quantity',
    validationSchema: rowDataZodSchema.shape.quantity,
    className: 'text-center font-medium',
    size: 70,
    minSize: 70,
    maxSize: 70,
    isNumeric: true,
    inputType: 'input',
    inputConfig: {
      placeholder: 'Quantity',
    },
    computeValue: calculateQuantity,
  },
  ...(type == 'MSR' || type == 'BLG' ? measurementColumns : []),
  {
    id: 'actions',
    header: 'Actions',
    size: 80,
    minSize: 80,
    maxSize: 80,
    className: 'text-center',
    cell: ({ row, table }) => {
      return (
        <ActionsCell
          row={row}
          table={table}
          saveErrors={saveErrors}
          handleSave={handleSave}
          handleDelete={handleDelete}
          createNewRow={createNewRow}
        />
      );
    },
  },
];

type ActionsCellProps = {
  row: Row<ItemMeasurmentRowData>;
  table: Table<ItemMeasurmentRowData>;
  saveErrors: Record<string, string | null>;
  handleSave: (
    rowData: ItemMeasurmentRowData,
    meta: TableMeta<ItemMeasurmentRowData>,
    rowIndex?: number
  ) => Promise<void>;
  handleDelete: (
    rowData: ItemMeasurmentRowData,
    meta: TableMeta<ItemMeasurmentRowData>
  ) => Promise<void>;
  createNewRow: (headerKey?: string) => ItemMeasurmentRowData;
};

const ActionsCell: React.FC<ActionsCellProps> = ({
  row,
  table,
  saveErrors,
  handleSave,
  handleDelete,
  createNewRow,
}) => {
  const rowData = row.original as ItemMeasurmentRowData;
  const isLoading = table.options.meta?.loadingRows?.has(rowData.id) ?? false;
  const isSaveDisabled = !rowData.isEdited || isLoading;

  const handleDuplicate = () => {
    if (!table.options.meta?.addRow) return;

    // This creates a new empty row with a unique ID and default values
    const emptyOriginal = createNewRow(rowData.headerKey);

    // This creates the duplicated row, using values from the source row (`rowData`)
    // but with a new ID and state flags.
    const { ...restOfRowData } = rowData;
    const newRowData: ItemMeasurmentRowData = {
      ...restOfRowData, // all data from the source row
      id: emptyOriginal.id, // A new unique ID
      isNew: true,
      isEdited: true,
    };

    // We add the new row, and tell `addRow` that its "original" state should be
    // the empty row we created. This makes it behave like a new, pre-filled row.
    (
      table.options.meta.addRow as (
        rowData: ItemMeasurmentRowData,
        index: number,
        originalRow: { original: ItemMeasurmentRowData }
      ) => void
    )(newRowData, row.index, {
      original: emptyOriginal,
    });
  };

  const isLastRow = row.index === table.getRowModel().rows.length - 1;
  const actions: ActionItem[] = [
    {
      id: 'cancel',
      label: 'Discard Changes',
      icon: X,
      onClick: () => table.options.meta?.cancelUpdate?.(String(rowData.id)),
      show: rowData.isEdited && !rowData.isNew,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onClick: handleDuplicate,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: () =>
        table.options.meta && handleDelete(rowData, table.options.meta),
      variant: 'destructive',
      disabled: isLastRow,
    },
  ];

  return (
    <div className='flex justify-center items-center gap-0.5'>
      <SaveButton
        onClick={() =>
          table.options.meta &&
          handleSave(rowData, table.options.meta, row.index)
        }
        disabled={isSaveDisabled}
        isLoading={isLoading}
        errorMessage={saveErrors[rowData.id]}
        isNew={rowData.isNew}
        isEdited={rowData.isEdited}
      />
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={handleDuplicate}
        disabled={isLoading}
        title='Duplicate'
      >
        <Copy className='h-3 w-3' />
      </Button>
      <ActionsDropdown actions={actions} disabled={isLoading} />
    </div>
  );
};
