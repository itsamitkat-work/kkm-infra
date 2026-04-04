'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useEstimation, EstimationItem } from '@/hooks/use-estimation';
import { calculateQuantity } from '../utils';
import { ItemMeasurmentRowData } from '../types';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

interface ImportMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectItemHashId: string;
  rate: number;
  scheduleQuantity: number;
  existingBillingItems?: ItemMeasurmentRowData[];
  onImport: (items: ItemMeasurmentRowData[]) => void;
}

interface MeasurementItem {
  id: string;
  date: string;
  description: string;
  no1: number;
  no2: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  isDuplicate?: boolean;
}

// Helper function to check if a measurement item is a duplicate of a billing item
const isDuplicate = (
  measurementItem: MeasurementItem,
  billingItem: ItemMeasurmentRowData
): boolean => {
  // Get the actual values, handling both direct values and _original values
  const billingQuantity =
    billingItem.quantity ?? billingItem._original?.quantity ?? 0;
  const billingNo1 = billingItem.no1 ?? billingItem._original?.no1 ?? 0;
  const billingNo2 = billingItem.no2 ?? billingItem._original?.no2 ?? 0;
  const billingLength =
    billingItem.length ?? billingItem._original?.length ?? 0;
  const billingWidth = billingItem.width ?? billingItem._original?.width ?? 0;
  const billingHeight =
    billingItem.height ?? billingItem._original?.height ?? 0;
  const billingDescription =
    billingItem.description ?? billingItem._original?.description ?? '';

  return (
    measurementItem.description === billingDescription &&
    measurementItem.no1 === billingNo1 &&
    measurementItem.no2 === billingNo2 &&
    measurementItem.length === billingLength &&
    measurementItem.width === billingWidth &&
    measurementItem.height === billingHeight &&
    Math.abs(measurementItem.quantity - billingQuantity) < 0.001 // Allow small floating point differences
  );
};

export function ImportMeasurementDialog({
  open,
  onOpenChange,
  projectItemHashId,
  rate,
  scheduleQuantity,
  existingBillingItems = [],
  onImport,
}: ImportMeasurementDialogProps) {
  const [isImporting, setIsImporting] = useState(false);

  // Fetch measurement data only when dialog is open
  const {
    data: measurementData,
    isLoading,
    isError,
  } = useEstimation(projectItemHashId, 'MSR', open);

  // Transform measurement data to table format and mark duplicates
  const measurementItems = useMemo(() => {
    if (!measurementData?.data) {
      return [];
    }
    return measurementData.data.map((item: EstimationItem) => {
      const row = {
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
      };
      const measurementItem: MeasurementItem = {
        ...row,
        quantity: calculateQuantity(row) ?? item.quantity,
      };

      // Check if this item is a duplicate of an existing billing item
      measurementItem.isDuplicate = existingBillingItems.some((billingItem) =>
        isDuplicate(measurementItem, billingItem)
      );

      return measurementItem;
    });
  }, [measurementData, existingBillingItems]);

  // Define columns
  const columns = useMemo<ColumnDef<MeasurementItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          const allRows = table.getRowModel().rows;
          const selectableRows = allRows.filter(
            (row) => !(row.original.isDuplicate ?? false)
          );
          const selectedRows = selectableRows.filter((row) =>
            row.getIsSelected()
          );
          const isAllSelected =
            selectableRows.length > 0 &&
            selectedRows.length === selectableRows.length;
          const isSomeSelected =
            selectedRows.length > 0 &&
            selectedRows.length < selectableRows.length;

          return (
            <div className='flex items-center justify-center h-full w-full'>
              <Checkbox
                checked={
                  isAllSelected
                    ? true
                    : isSomeSelected
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={(value) => {
                  // Only toggle selectable rows (exclude duplicates)
                  selectableRows.forEach((row) => {
                    if (value) {
                      row.toggleSelected(true);
                    } else {
                      row.toggleSelected(false);
                    }
                  });
                }}
                aria-label='Select all'
                disabled={selectableRows.length === 0}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const isDuplicate = row.original.isDuplicate ?? false;

          return (
            <div className='flex items-center justify-center h-full w-full'>
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                  if (!isDuplicate) {
                    row.toggleSelected(!!value);
                  }
                }}
                aria-label={`Select item ${row.id}`}
                disabled={isDuplicate}
              />
            </div>
          );
        },
        enableSorting: false,
        size: 48,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 96,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 200,
      },
      {
        accessorKey: 'no1',
        header: 'No1',
        size: 64,
      },
      {
        accessorKey: 'no2',
        header: 'No2',
        size: 64,
      },
      {
        accessorKey: 'length',
        header: 'Length',
        size: 80,
      },
      {
        accessorKey: 'width',
        header: 'Width',
        size: 80,
      },
      {
        accessorKey: 'height',
        header: 'Height',
        size: 80,
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 96,
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return (
            <div className='text-right font-medium tabular-nums'>
              {new Intl.NumberFormat('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(value)}
            </div>
          );
        },
      },
    ],
    []
  );

  // Create table instance
  const table = useReactTable<MeasurementItem>({
    data: measurementItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  // Select all non-duplicate items by default when dialog opens and data is loaded
  useEffect(() => {
    if (open && measurementItems.length > 0) {
      // Only select items that are not duplicates
      const selectableRows = table
        .getRowModel()
        .rows.filter((row) => !(row.original.isDuplicate ?? false));
      selectableRows.forEach((row) => {
        row.toggleSelected(true);
      });
    } else if (!open) {
      table.resetRowSelection();
    }
  }, [open, measurementItems, table]);

  const handleImport = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedItems = selectedRows.map((row) => row.original);

    if (selectedItems.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      // Transform selected items to billing table format
      const importedItems: ItemMeasurmentRowData[] = selectedItems.map(
        (item) => {
          const newId = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          const newRow = {
            id: newId,
            date: item.date,
            description: item.description,
            no1: item.no1,
            no2: item.no2,
            length: item.length,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            rate: rate,
            schedule_quantity: scheduleQuantity,
            isNew: true,
            isEdited: true,
            checked: 'false',
            verified: 'false',
          };

          return {
            ...newRow,
            quantity: calculateQuantity(newRow) ?? item.quantity,
          } as ItemMeasurmentRowData;
        }
      );

      onImport(importedItems);
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Import from Measurement</DialogTitle>
          <DialogDescription>
            Select measurement items to import into billing. Items already
            imported are disabled. All available items are selected by default.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-auto border rounded-lg'>
          {isLoading && (
            <div className='flex items-center justify-center p-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              <span className='ml-2 text-sm text-muted-foreground'>
                Loading measurement items...
              </span>
            </div>
          )}

          {isError && (
            <div className='p-8 text-center text-destructive'>
              Error loading measurement items. Please try again.
            </div>
          )}

          {!isLoading && !isError && measurementItems.length === 0 && (
            <div className='p-8 text-center text-muted-foreground'>
              No measurement items found for this project item.
            </div>
          )}

          {!isLoading && !isError && measurementItems.length > 0 && (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{
                          width:
                            header.getSize() !== 150
                              ? header.getSize()
                              : undefined,
                        }}
                        className={
                          header.id === 'select'
                            ? 'w-12'
                            : header.id === 'date'
                              ? 'w-24'
                              : header.id === 'description'
                                ? 'min-w-[200px]'
                                : header.id === 'no1' || header.id === 'no2'
                                  ? 'w-16 text-center'
                                  : header.id === 'length' ||
                                      header.id === 'width' ||
                                      header.id === 'height'
                                    ? 'w-20 text-center'
                                    : header.id === 'quantity'
                                      ? 'w-24 text-right'
                                      : ''
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      row.original.isDuplicate
                        ? 'opacity-50 bg-muted/30'
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          cell.column.id === 'date'
                            ? 'text-sm text-muted-foreground'
                            : cell.column.id === 'description'
                              ? 'font-medium'
                              : cell.column.id === 'no1' ||
                                  cell.column.id === 'no2' ||
                                  cell.column.id === 'length' ||
                                  cell.column.id === 'width' ||
                                  cell.column.id === 'height'
                                ? 'text-center text-muted-foreground'
                                : ''
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Importing...
              </>
            ) : (
              `Import ${selectedCount} ${
                selectedCount === 1 ? 'item' : 'items'
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
