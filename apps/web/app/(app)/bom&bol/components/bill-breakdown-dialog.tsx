'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconExternalLink,
  IconPackage,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useBillItemBreakdownQuery } from '../hooks/use-bill-item-breakdown-query';
import type { BolBomType } from '../api/bol-bom-api';

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export type IndentQtyItem = {
  projectItemId: string;
  newIndentQty: number;
};

interface BillBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  code: string | null;
  type: BolBomType;
  itemType: string | null;
  description?: string;
  variant?: 'breakdown' | 'order';
  onSaveOrder?: (items: IndentQtyItem[]) => void;
}

export function BillBreakdownDialog({
  open,
  onOpenChange,
  projectId,
  code,
  type,
  itemType,
  description,
  variant = 'breakdown',
  onSaveOrder,
}: BillBreakdownDialogProps) {
  const {
    data: rows,
    isLoading,
    isError,
    error,
  } = useBillItemBreakdownQuery(
    projectId,
    code,
    type,
    itemType,
    open
  );

  const [newIndentQtyMap, setNewIndentQtyMap] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    if (variant === 'order' && rows.length > 0) {
      const initialMap: Record<string, string> = {};
      rows.forEach((row) => {
        initialMap[row.projectItemId] = String(row.indentQty ?? 0);
      });
      setNewIndentQtyMap(initialMap);
    }
  }, [variant, rows, open]);

  const handleSaveOrder = React.useCallback(() => {
    const items: IndentQtyItem[] = rows.map((row) => ({
      projectItemId: row.projectItemId,
      newIndentQty:
        Number(newIndentQtyMap[row.projectItemId] ?? row.indentQty ?? 0) || 0,
    }));
    onSaveOrder?.(items);
    onOpenChange(false);
  }, [rows, newIndentQtyMap, onSaveOrder, onOpenChange]);

  const isOrderVariant = variant === 'order';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <div className='flex flex-col gap-1'>
            <DialogTitle className='text-xl flex items-center gap-2'>
              <IconPackage className='w-5 h-5 text-primary' />
              {isOrderVariant ? 'Update Indent Quantities' : 'Item Breakdown'}
            </DialogTitle>
            <p className='text-sm text-muted-foreground font-medium'>
              {code}{' '}
              {description && (
                <span className='font-normal'>— {description}</span>
              )}
            </p>
          </div>
        </DialogHeader>

        <DialogBody className='flex-1 overflow-auto p-0'>
          {isLoading ? (
            <div className='p-6 space-y-4'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full rounded-md' />
              ))}
            </div>
          ) : isError ? (
            <div className='flex flex-col items-center justify-center py-20 text-destructive gap-2'>
              <IconAlertCircle className='w-10 h-10' />
              <p className='font-medium'>
                {error instanceof Error
                  ? error.message
                  : 'Failed to load breakdown.'}
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-muted-foreground gap-2'>
              <IconPackage className='w-10 h-10 opacity-20' />
              <p>No breakdown items found.</p>
            </div>
          ) : (
            <div className='relative'>
              <Table className='border-separate border-spacing-0'>
                <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
                  <TableRow>
                    <TableHead className='w-12 text-center bg-muted/30'>
                      #
                    </TableHead>
                    <TableHead className='w-[140px]'>Item Code</TableHead>
                    <TableHead className='min-w-[120px] max-w-[200px]'>
                      Description
                    </TableHead>
                    <TableHead className='w-20 text-center'>Unit</TableHead>
                    <TableHead className='w-32 text-right'>Rate</TableHead>
                    <TableHead className='w-28 text-right'>Qty</TableHead>
                    {isOrderVariant && (
                      <TableHead className='w-20 min-w-20 max-w-20 text-right sticky right-0 z-20 border-l shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]'>
                        Indent Qty
                      </TableHead>
                    )}
                    {!isOrderVariant && (
                      <TableHead className='w-20 text-center'>Link</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.projectItemId}
                      className='hover:bg-muted/50 transition-colors'
                    >
                      <TableCell className='text-center text-xs text-muted-foreground font-mono border-b'>
                        {index + 1}
                      </TableCell>
                      <TableCell className='font-mono text-xs font-semibold border-b'>
                        {row.itemCode}
                      </TableCell>
                      <TableCell className='border-b max-w-[200px]'>
                        <div className='flex flex-col min-w-0'>
                          <span className='text-sm font-medium line-clamp-1'>
                            {row.itemName}
                          </span>
                          <span className='text-xs text-muted-foreground line-clamp-1'>
                            {row.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-center text-sm border-b'>
                        {row.unit}
                      </TableCell>
                      <TableCell className='text-right text-sm font-mono border-b'>
                        {formatCurrency(row.rate)}
                      </TableCell>
                      <TableCell className='text-right text-sm font-semibold border-b'>
                        {row.quantity.toLocaleString('en-IN')}
                      </TableCell>
                      {isOrderVariant && (
                        <TableCell className='border-b sticky right-0 z-10 w-20 min-w-20 max-w-20 border-l shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]'>
                          <Input
                            type='number'
                            className='h-8 text-right font-mono'
                            value={newIndentQtyMap[row.projectItemId] ?? ''}
                            placeholder={String(row.indentQty ?? 0)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewIndentQtyMap((prev) => ({
                                ...prev,
                                [row.projectItemId]: val,
                              }));
                            }}
                          />
                        </TableCell>
                      )}
                      {!isOrderVariant && (
                        <TableCell className='text-center border-b'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            asChild
                          >
                            <Link href={`#` /* Link logic here */}>
                              <IconExternalLink className='w-4 h-4' />
                            </Link>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogBody>

        <DialogFooter className='p-4 border-t bg-muted/30'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isOrderVariant && (
            <Button
              onClick={handleSaveOrder}
              disabled={(() => {
                const defaultVal = (row: (typeof rows)[0]) =>
                  String(row.indentQty ?? 0);
                const isValidQty = (val: string) =>
                  val !== '' && !Number.isNaN(Number(val)) && Number(val) >= 0;
                const hasValidChange = rows.some((row) => {
                  const v = newIndentQtyMap[row.projectItemId] ?? '';
                  return isValidQty(v) && v !== defaultVal(row);
                });
                const allValid = rows.every((row) => {
                  const v = newIndentQtyMap[row.projectItemId] ?? '';
                  return v === '' || isValidQty(v);
                });
                return !hasValidChange || !allValid;
              })()}
            >
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
