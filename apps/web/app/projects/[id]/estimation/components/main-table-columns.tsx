'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EstimationRowData, ProjectItemType } from '../types';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEstimationStore } from '../hooks/use-estimation-store';
import { ActionsDropdown, ActionItem } from '@/components/ui/actions-dropdown';
import { DeleteConfirmationData } from '@/hooks/use-delete-confirmation';
import { useEstimationShare } from '../hooks/use-estimation-share';
import { DataTableColumnHeader } from './column-header';
import { Button } from '@/components/ui/button';

interface ColumnProps {
  type: ProjectItemType;
  onDelete?: (row: EstimationRowData) => void;
  openDeleteConfirmation?: (data: DeleteConfirmationData) => void;
}

// Component for actions cell that can use hooks
function ShareActionsCell({
  row,
  onDelete,
  openDeleteConfirmation,
}: {
  row: { original: EstimationRowData };
  onDelete?: (row: EstimationRowData) => void;
  openDeleteConfirmation?: (data: DeleteConfirmationData) => void;
}) {
  const { handleShareItem } = useEstimationShare();

  if (!onDelete || !openDeleteConfirmation) {
    return null;
  }

  const actions: ActionItem[] = [
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: () => handleShareItem(row.original),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: () => {
        openDeleteConfirmation({
          onConfirm: () => onDelete(row.original),
          itemName: 'project item',
        });
      },
      variant: 'destructive',
    },
  ];

  return (
    <div
      className='flex justify-center relative'
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <ActionsDropdown actions={actions} modal={false} />
    </div>
  );
}

// Component to access store for quantity2
const Quantity2Cell = ({
  row,
  type,
}: {
  row: EstimationRowData;
  type: ProjectItemType;
}) => {
  const updatedQuantity = useEstimationStore(
    (state) => state.updatedQuantities[row.id]
  );

  const quantity2 = parseFloat(
    type === 'EST'
      ? row.estimate_quantity || '0'
      : row.measurment_quantity || '0'
  );

  // Use updatedQuantity if available, otherwise use quantity2 from row
  const finalQuantity =
    updatedQuantity !== undefined ? updatedQuantity : quantity2;

  return (
    <div className='text-right tabular-nums text-muted-foreground'>
      {finalQuantity.toFixed(2)}
    </div>
  );
};

// Component to access store within cell
const Amount2Cell = ({
  row,
  type,
}: {
  row: EstimationRowData;
  type: ProjectItemType;
}) => {
  const updatedAmount = useEstimationStore(
    (state) => state.updatedAmounts[row.id]
  );

  const quantity1 = parseFloat(
    type === 'EST' ? row.quantity : row.estimate_quantity || '0'
  );
  const quantity2 = parseFloat(
    type === 'EST'
      ? row.estimate_quantity || '0'
      : row.measurment_quantity || '0'
  );
  const rate = parseFloat(row.rate || '0');

  // Calculate the final amount (use updatedAmount if available, otherwise calculate from quantity2)
  const finalAmount =
    updatedAmount === undefined ? quantity2 * rate : updatedAmount;

  // Calculate the base amount (quantity1 * rate)
  const baseAmount = quantity1 * rate;

  // Calculate cost deviation based on finalAmount vs baseAmount
  // This ensures the deviation reflects the actual updated amount from measurements
  const costDeviation = finalAmount - baseAmount;

  const costSeverity: 'error' | 'success' | 'neutral' =
    costDeviation > 0 ? 'error' : costDeviation < 0 ? 'success' : 'neutral';

  const costDeviationClass =
    costSeverity === 'error'
      ? 'text-destructive'
      : costSeverity === 'success'
        ? 'text-chart-2'
        : 'text-muted-foreground';

  // Round to 2 decimal places before formatting
  const formattedAmount = parseFloat(finalAmount.toFixed(2));

  return (
    <div
      className={`flex items-center justify-end gap-0.5 tabular-nums ${costDeviationClass}`}
    >
      {costDeviation > 0 ? (
        <ArrowUpRight className='h-3.5 w-3.5' />
      ) : costDeviation < 0 ? (
        <ArrowDownRight className='h-3.5 w-3.5' />
      ) : null}
      <div className='font-medium'>{formatCurrency(formattedAmount)}</div>
    </div>
  );
};

export const getMainColumns = ({
  type,
  onDelete,
  openDeleteConfirmation,
}: ColumnProps): ColumnDef<EstimationRowData>[] => [
  {
    accessorKey: 'index',
    header: () => <div className='text-center text-muted-foreground'>#</div>,
    cell: ({ row }) => (
      <div className='text-center text-muted-foreground'>{row.index + 1}</div>
    ),
    size: 40,
    enableSorting: false,
  },
  {
    accessorKey: 'srNo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Wo. No.' />
    ),
    cell: ({ row }) => <div className='text-center'>{row.original.srNo}</div>,
    size: 70,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Item Name' />
    ),
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();
      return (
        <Button
          variant='ghost'
          className='w-full justify-start hover:text-primary transition-all duration-200 hover:bg-muted/30 rounded-sm px-1 py-0.5 -mx-1 -my-0.5 h-auto whitespace-normal text-left font-normal'
          onClick={() => row.toggleExpanded()}
          title={row.original.name}
        >
          <div
            className={`flex items-center gap-2 w-full min-w-0 ${
              isExpanded ? 'items-start' : 'items-center'
            }`}
          >
            <div className='relative flex h-4 w-4 items-center justify-center'>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-all duration-200 ease-in-out absolute ${
                  isExpanded
                    ? 'rotate-0 opacity-100'
                    : 'rotate-[-90deg] opacity-0'
                }`}
              />
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-all duration-200 ease-in-out absolute ${
                  isExpanded ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                }`}
              />
            </div>
            <span
              className={`flex-1 ${
                isExpanded ? 'break-words whitespace-normal' : 'truncate'
              }`}
            >
              {row.original.name}
            </span>
          </div>
        </Button>
      );
    },
    // size: undefined, // Let it be fluid
  },
  {
    id: 'group1',
    header: type === 'EST' ? 'Planned' : 'Estimated',
    columns: [
      {
        id: 'quantity1',
        accessorFn: (row) => {
          const val =
            type === 'EST' ? row.quantity : row.estimate_quantity || '0';
          return parseFloat(String(val));
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Quantity'
            alignment='end'
          />
        ),
        cell: ({ row }) => {
          const quantity1 = parseFloat(
            type === 'EST'
              ? row.original.quantity
              : row.original.estimate_quantity || '0'
          );
          return (
            <div className='text-right tabular-nums text-muted-foreground'>
              {quantity1.toFixed(2)}
            </div>
          );
        },
        size: 90,
      },
      {
        id: 'amount1',
        accessorFn: (row) => {
          const qty = parseFloat(
            String(type === 'EST' ? row.quantity : row.estimate_quantity || '0')
          );
          const rate = parseFloat(row.rate || '0');
          return qty * rate;
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Cost' alignment='end' />
        ),
        cell: ({ row }) => {
          const quantity1 = parseFloat(
            type === 'EST'
              ? row.original.quantity
              : row.original.estimate_quantity || '0'
          );
          const rate = parseFloat(row.original.rate || '0');
          const amount = quantity1 * rate;
          // Round to 2 decimal places before formatting
          const formattedAmount = parseFloat(amount.toFixed(2));
          return (
            <div className='text-right tabular-nums text-muted-foreground'>
              {formatCurrency(formattedAmount)}
            </div>
          );
        },
        size: 110,
      },
    ],
  },
  {
    id: 'group2',
    header: type === 'EST' ? 'Estimated' : 'Measured',
    columns: [
      {
        id: 'quantity2',
        accessorFn: (row) => {
          const val =
            type === 'EST'
              ? row.estimate_quantity || '0'
              : row.measurment_quantity || '0';
          return parseFloat(String(val));
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Quantity'
            alignment='end'
          />
        ),
        cell: ({ row }) => {
          return <Quantity2Cell row={row.original} type={type} />;
        },
        size: 90,
      },
      {
        id: 'amount2',
        // Note: Sorting by amount2 is tricky because it depends on useEstimationStore state.
        // For now, we will sort by the base db value.
        // Architecturally, if we want to sort by client-side modified state, we need to pass that state in or use a custom sorting function.
        // Keep simple for now: sort by db value.
        accessorFn: (row) => {
          const qty = parseFloat(
            String(
              type === 'EST'
                ? row.estimate_quantity || '0'
                : row.measurment_quantity || '0'
            )
          );
          const rate = parseFloat(row.rate || '0');
          return qty * rate;
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Cost' alignment='end' />
        ),
        cell: ({ row }) => <Amount2Cell row={row.original} type={type} />,
        size: 110,
      },
    ],
  },
  ...(onDelete && openDeleteConfirmation
    ? [
        {
          id: 'actions',
          cell: ({ row }) => (
            <ShareActionsCell
              row={row}
              onDelete={onDelete}
              openDeleteConfirmation={openDeleteConfirmation}
            />
          ),
          size: 40,
          enableSorting: false,
        } as ColumnDef<EstimationRowData>,
      ]
    : []),
];
