import { UnitDisplay } from '@/components/ui/unit-display';
import { parseNumber } from '@/lib/utils';
import { ProjectItemRowType, projectItemZodSchema } from '@/types/project-item';
import { Row } from '@tanstack/react-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';
import {
  MasterItemEditorConfig,
  type MasterItemEditorConfigType,
} from './MasterItemEditorConfig';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { getSelectedMasterItem } from './use-master-item-selection';
import { buildPatchFromSelection } from '../utils';
import { Checkbox } from '@/components/ui/checkbox';

function createMasterItemOnChangeUpdateRow() {
  return ({ draftRow }: { draftRow: ProjectItemRowType }) => {
    const rowId = String(draftRow.id);
    const selectedMasterItem = getSelectedMasterItem(rowId);

    if (!selectedMasterItem) {
      return;
    }

    // Build and return the patch to update all related fields
    return buildPatchFromSelection(selectedMasterItem);
  };
}

const masterItemOnChangeUpdateRow = createMasterItemOnChangeUpdateRow();

const codeColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Code',
  searchPlaceholder: 'Search by code',
  searchField: 'code',
  getOptionLabel: (option) => option.code,
  renderSelectedValue: (option, placeholder, rowValue) =>
    option?.code || rowValue || placeholder,
  getOnChangeValue: (option) => option?.code ?? '',
  getRowValue: (row) => row.code ?? '',
};

const nameColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Item',
  searchPlaceholder: 'Search by name',
  searchField: 'name',
  renderSelectedValue: (option, placeholder, rowValue) =>
    option?.name || rowValue || placeholder,
  getOnChangeValue: (option) => option?.name ?? '',
  getOptionLabel: (option) => option.name,
  getRowValue: (row) => row.name ?? '',
};

export const getColumns = (): ExtendedColumnDef<ProjectItemRowType>[] => {
  return [
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
      accessorKey: 'index',
      header: '#',
      size: 50,
      minSize: 50,
      maxSize: 50,
      className: 'text-center text-muted-foreground',
      cell: ({ row }: { row: Row<ProjectItemRowType> }) => {
        return <span className='text-muted-foreground'>{row.index + 1}</span>;
      },
    },
    {
      accessorKey: 'srNo',
      header: 'Wo. No.',
      validationSchema: projectItemZodSchema.shape.srNo,
      className: 'text-center',
      size: 100,
      minSize: 100,
      maxSize: 100,
      inputType: 'input' as const,
      inputConfig: {
        placeholder: 'Enter serial number...',
      },
    },
    {
      accessorKey: 'code',
      header: 'Code',
      validationSchema: projectItemZodSchema.shape.code,
      className: 'text-center',
      inputType: 'combobox' as const,
      editor: (props) => (
        <MasterItemEditorConfig
          row={props.rowData}
          onChange={props.onChange}
          autoFocus={props.autoFocus}
          config={codeColumnConfig}
        />
      ),
      maxSize: 100,
      minSize: 100,
      onChangeUpdateRow: masterItemOnChangeUpdateRow,
    },
    {
      accessorKey: 'dsrCode',
      header: 'DSR Code',
      validationSchema: projectItemZodSchema.shape.dsrCode,
      className: 'text-center',
      maxSize: 100,
      minSize: 100,
    },
    {
      accessorKey: 'scheduleName',
      header: 'Schedule',
      validationSchema: projectItemZodSchema.shape.scheduleName,
      className:
        'text-center bg-gray-100 dark:bg-gray-800 truncate text-muted-foreground',
    },
    {
      accessorKey: 'name',
      header: 'Item Name',
      validationSchema: projectItemZodSchema.shape.name,
      className: 'bg-gray-100 dark:bg-gray-800 truncate',
      minSize: 270,
      maxSize: 270,
      style: {
        width: '270px',
        maxWidth: '270px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
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
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue() as string;

        return (
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <div
                className='cursor-help'
                style={{
                  width: '250px',
                  maxWidth: '250px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className='max-w-xs'>{value}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      size: 100,
      maxSize: 100,
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue() as string;
        return <UnitDisplay className='text-muted-foreground' unit={value} />;
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      validationSchema: projectItemZodSchema.shape.quantity,
      className: 'text-center truncate',
      isNumeric: true,
      inputType: 'input' as const,
      inputConfig: {
        placeholder: 'Enter quantity...',
      },
      size: 100,
      maxSize: 100,
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      validationSchema: projectItemZodSchema.shape.rate,
      className: 'text-center',
      isNumeric: true,
      inputType: 'input' as const,
      inputConfig: {
        placeholder: 'Enter rate...',
      },
      minSize: 100,
      maxSize: 100,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      validationSchema: projectItemZodSchema.shape.total,
      className: 'text-center bg-gray-100 dark:bg-gray-800 font-semibold',
      isNumeric: true,
      computeValue: (row: ProjectItemRowType) => {
        const quantity = parseNumber(row.quantity);
        const rate = parseNumber(row.rate);

        // Handle NaN cases
        if (isNaN(quantity) || isNaN(rate)) {
          return '0.00';
        }

        // Calculate and format to 2 decimal places
        const total = quantity * rate;
        return total.toFixed(2);
      },
    },
    {
      accessorKey: 'remark',
      header: 'Remark',
      validationSchema: projectItemZodSchema.shape.remark,
      className: 'text-center',
      inputType: 'input' as const,
      inputConfig: {
        placeholder: 'Enter remarks...',
      },
    },
  ];
};
