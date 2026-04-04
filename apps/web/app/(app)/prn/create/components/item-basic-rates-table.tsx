'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useItemBasicRatesQuery } from '../../hooks/use-item-basic-rates-query';
import { useSavePrnMutation } from '../../hooks/use-save-prn-mutation';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

interface ItemBasicRatesTableProps {
  projectId: string;
  projectItemId: string;
  type?: string;
}

export function ItemBasicRatesTable({
  projectId,
  projectItemId,
  type = 'Material',
}: ItemBasicRatesTableProps) {
  const {
    data: rows,
    isLoading,
    isError,
    error,
  } = useItemBasicRatesQuery(projectId, projectItemId, type, true);
  const savePrnMutation = useSavePrnMutation();

  const [newQtyMap, setNewQtyMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (rows?.length) {
      const initial: Record<string, string> = {};
      rows.forEach((r) => {
        initial[r.basicRateId] = '';
      });
      setNewQtyMap(initial);
    }
  }, [rows]);

  if (isLoading) {
    return (
      <div className='p-4 space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-8 w-full' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className='p-4 text-sm text-destructive'>
        {error instanceof Error ? error.message : 'Failed to load basic rates'}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className='p-4 text-sm text-muted-foreground'>
        No basic rates for this item.
      </div>
    );
  }

  const hasNonZeroNewQty = rows.some(
    (row) => Number(newQtyMap[row.basicRateId] ?? 0) > 0
  );
  const allWithinBalance = rows.every((row) => {
    const balance = row.quantity - (row.indentQty ?? 0);
    const addVal = Number(newQtyMap[row.basicRateId] ?? 0);
    return addVal <= balance && addVal >= 0;
  });
  const canSave =
    hasNonZeroNewQty &&
    allWithinBalance &&
    !savePrnMutation.isPending;

  function handleSave() {
    if (!rows?.length) return;
    const items = rows
      .map((row) => {
        const addQty = Number(newQtyMap[row.basicRateId] ?? 0) || 0;
        if (addQty <= 0) return null;
        return {
          projectId,
          projectItemId,
          basicRateId: row.basicRateId,
          quantity: addQty,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (!items.length) return;
    savePrnMutation.mutate(items);
  }

  return (
    <div className='p-4'>
      <div className='flex justify-between mb-2'>
        <div>
          <span>Sub Items</span>
        </div>
        <Button
          size='sm'
          disabled={!canSave}
          onClick={handleSave}
          aria-busy={savePrnMutation.isPending}
        >
          {savePrnMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            <TableHead className='w-14 text-center'>Sr.No.</TableHead>
            <TableHead className='min-w-[80px]'>Code</TableHead>
            <TableHead className='min-w-[200px]'>Description</TableHead>
            <TableHead className='w-20 text-center'>Unit</TableHead>
            <TableHead className='w-24 text-right'>Net QTY</TableHead>
            <TableHead className='w-24 text-right'>PRN QTY</TableHead>
            <TableHead className='w-24 text-right'>Balance</TableHead>
            <TableHead className='w-28 text-right'>Add PRN QTY</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const balance = row.quantity - (row.indentQty ?? 0);
            const addVal = Number(newQtyMap[row.basicRateId] ?? 0);
            const exceedsBalance = addVal > balance;
            return (
              <TableRow key={row.basicRateId}>
                <TableCell className='text-center text-muted-foreground text-xs'>
                  {index + 1}
                </TableCell>
                <TableCell className='font-mono text-xs'>{row.code}</TableCell>
                <TableCell className='text-sm'>{row.description}</TableCell>
                <TableCell className='text-center text-sm'>
                  {row.unit}
                </TableCell>
                <TableCell className='text-right text-sm font-mono'>
                  {formatQty(row.quantity)}
                </TableCell>
                <TableCell className='text-right text-sm font-mono'>
                  {formatQty(row.indentQty ?? 0)}
                </TableCell>
                <TableCell className='text-right text-sm font-mono'>
                  {formatQty(balance)}
                </TableCell>
                <TableCell className='flex justify-end'>
                  <Input
                    type='number'
                    disableStepArrows
                    min={0}
                    className={cn(
                      'h-8 w-20 text-right font-mono text-sm',
                      exceedsBalance &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    value={newQtyMap[row.basicRateId] ?? ''}
                    placeholder='0'
                    aria-invalid={exceedsBalance}
                    onChange={(e) =>
                      setNewQtyMap((prev) => ({
                        ...prev,
                        [row.basicRateId]: e.target.value,
                      }))
                    }
                    onBlur={(e) => {
                      const val = Number(
                        (e.target as HTMLInputElement).value || 0
                      );
                      if (val > balance) {
                        toast.error(
                          `Add PRN QTY cannot exceed Balance (${formatQty(balance)})`
                        );
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
