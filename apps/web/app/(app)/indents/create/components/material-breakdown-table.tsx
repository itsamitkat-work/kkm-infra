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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NumberInput } from '@/components/number-input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/auth';
import { useBillItemBreakdownQuery } from '@/app/(app)/bom&bol/hooks/use-bill-item-breakdown-query';
import type { BolBomType } from '@/app/(app)/bom&bol/api/bol-bom-api';
import type { ProjectBoqLinesQueryScope } from '@/app/projects/[id]/estimation/types';
import { useSaveIndentMutation } from '../../hooks/use-save-indent-mutation';

function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

function formatCurrency(value: number): string {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

interface MaterialBreakdownTableProps {
  projectId: string;
  code: string;
  type?: BolBomType;
  itemType?: ProjectBoqLinesQueryScope;
  basicRateId: string;
}

export function MaterialBreakdownTable({
  projectId,
  code,
  basicRateId,
  type = 'Material',
  itemType = 'planned',
}: MaterialBreakdownTableProps) {
  const { user } = useAuth();
  const {
    data: rows,
    isLoading,
    isError,
    error,
  } = useBillItemBreakdownQuery(projectId, code, type, itemType, true);
  const saveIndentMutation = useSaveIndentMutation();

  const [newQtyMap, setNewQtyMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (rows?.length) {
      const initial: Record<string, string> = {};
      rows.forEach((r) => {
        initial[r.projectItemId] = '';
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
        {error instanceof Error ? error.message : 'Failed to load breakdown'}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className='p-4 text-sm text-muted-foreground'>
        No breakdown items for this material.
      </div>
    );
  }

  const hasNonZeroNewIndentQty = rows.some(
    (row) => Number(newQtyMap[row.projectItemId] ?? 0) > 0
  );
  const allWithinBalance = rows.every((row) => {
    const balance = row.quantity - (row.indentQty ?? 0);
    const addVal = Number(newQtyMap[row.projectItemId] ?? 0);
    return addVal <= balance && addVal >= 0;
  });
  const canSave =
    hasNonZeroNewIndentQty && allWithinBalance && !saveIndentMutation.isPending;

  function handleSave() {
    if (!rows?.length) return;
    const makerId = user?.hashId;
    if (!makerId) {
      toast.error('User not found');
      return;
    }
    const items = rows
      .map((row) => {
        const addQty = Number(newQtyMap[row.projectItemId] ?? 0) || 0;
        if (addQty <= 0) return null;
        return {
          projectId,
          projectItemId: row.projectItemId,
          basicRateId: basicRateId,
          quantity: addQty,
          makerId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (!items.length) return;
    saveIndentMutation.mutate(items);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className='p-4'>
        <div className='flex justify-between mb-2'>
          <div>
            <span>Breakdown Items</span>
          </div>
          <Button
            disabled={!canSave}
            onClick={handleSave}
            aria-busy={saveIndentMutation.isPending}
          >
            {saveIndentMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div className='overflow-x-auto'>
          <Table className='border-separate border-spacing-0 table-fixed'>
            <TableHeader>
              <TableRow className='bg-muted/50 hover:bg-muted/50'>
                <TableHead className='w-14'>Sr.No.</TableHead>
                <TableHead className='w-20'>Code</TableHead>
                <TableHead className='w-40'>Description</TableHead>
                <TableHead className='w-20 text-center'>Unit</TableHead>
                <TableHead className='w-24 text-right'>Rate</TableHead>
                <TableHead className='w-24 text-right'>Qty</TableHead>
                <TableHead className='w-24 text-right'>Indent Qty</TableHead>
                <TableHead className='w-24 text-center'>Balance</TableHead>
                <TableHead
                  className='w-18 min-w-18 max-w-18 text-right sticky right-0 z-20 bg-muted border-l border-dotted
'
                >
                  Add Indent QTY
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const balance = row.quantity - (row.indentQty ?? 0);
                const addVal = Number(newQtyMap[row.projectItemId] ?? 0);
                const exceedsBalance = addVal > balance;
                return (
                  <TableRow key={row.projectItemId}>
                    <TableCell className='text-muted-foreground text-xs'>
                      {index + 1}
                    </TableCell>
                    <TableCell className='font-mono text-xs w-20'>
                      {row.itemCode}
                    </TableCell>
                    <TableCell className='text-sm min-w-0 w-40 overflow-hidden'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='block truncate cursor-default'>
                            {row.itemName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='max-w-sm'>
                          {row.itemName}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className='text-center text-sm'>
                      {row.unit}
                    </TableCell>
                    <TableCell className='text-right text-sm font-mono'>
                      {formatCurrency(row.rate ?? 0)}
                    </TableCell>
                    <TableCell className='text-right text-sm font-mono'>
                      {formatQty(row.quantity)}
                    </TableCell>
                    <TableCell className='text-right text-sm font-mono'>
                      {formatQty(row.indentQty ?? 0)}
                    </TableCell>
                    <TableCell className='text-center text-sm font-mono'>
                      {formatQty(balance)}
                    </TableCell>
                    <TableCell
                      className='sticky right-0 z-10 bg-white dark:bg-slate-950 border-l border-dotted
 w-28 min-w-28 max-w-28'
                    >
                      <div className='flex justify-end'>
                        <NumberInput
                          type='number'
                          disableStepArrows
                          min={0}
                          className={cn(
                            'h-8 w-20 text-right font-mono text-sm',
                            exceedsBalance &&
                              'border-destructive focus-visible:ring-destructive'
                          )}
                          value={newQtyMap[row.projectItemId] ?? ''}
                          placeholder='0'
                          aria-invalid={exceedsBalance}
                          onChange={(e) =>
                            setNewQtyMap((prev) => ({
                              ...prev,
                              [row.projectItemId]: e.target.value,
                            }))
                          }
                          onBlur={(e) => {
                            const val = Number(
                              (e.target as HTMLInputElement).value || 0
                            );
                            if (val > balance) {
                              toast.error(
                                `Add Indent QTY cannot exceed Balance (${formatQty(balance)})`
                              );
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
