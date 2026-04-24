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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIndentDetailsQuery } from '../hooks/use-indent-details-query';
import {
  useIndentCheckMutation,
  useIndentVerifyMutation,
} from '../hooks/use-indent-check-verify-mutation';
import type { IndentDetailItem } from '../api/indent-api';
import { cn } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';

interface IndentDetailsTableProps {
  indentCode: string;
  role: string;
  className?: string;
}

function formatQty(value: number): string {
  return value?.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export function IndentDetailsTable({
  indentCode,
  role,
  className,
}: IndentDetailsTableProps) {
  const {
    data: rows,
    isLoading,
    isError,
    error,
  } = useIndentDetailsQuery(indentCode, role);
  const checkMutation = useIndentCheckMutation();
  const verifyMutation = useIndentVerifyMutation();

  if (isLoading) {
    return (
      <div className={cn('p-4 space-y-2', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-8 w-full' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn('p-4 text-sm text-destructive', className)}>
        {error instanceof Error
          ? error.message
          : 'Failed to load indent details'}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        No items in this indent.
      </div>
    );
  }

  return (
    <div className={cn('p-4 overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            <TableHead className='w-12'>#</TableHead>
            <TableHead className='min-w-[200px]'>Item</TableHead>
            <TableHead className='min-w-[140px]'>Material</TableHead>
            <TableHead className='w-24 text-right'>Quantity</TableHead>
            <TableHead className='min-w-[100px] text-center'>Checked</TableHead>
            <TableHead className='min-w-[110px] text-center'>
              Verified
            </TableHead>
            <TableHead className='w-24'>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: IndentDetailItem, index: number) => (
            <TableRow key={row.indentDetailsHashId}>
              <TableCell className='text-muted-foreground text-sm'>
                {index + 1}
              </TableCell>
              <TableCell
                className='text-sm max-w-[300px] truncate'
                title={row.itemName}
              >
                {row.itemName}
              </TableCell>
              <TableCell className='text-sm text-muted-foreground'>
                {row.materialName}
              </TableCell>
              <TableCell className='text-right text-sm text-muted-foreground'>
                {formatQty(row.quantity)}
              </TableCell>
              <TableCell className='text-center'>
                {row.isChecked === 1 ? (
                  <Badge variant='secondary' className='gap-1'>
                    <IconCheck className='size-3' />
                    Checked
                  </Badge>
                ) : (
                  <Button
                    variant='outline'
                    onClick={() =>
                      checkMutation.mutate({
                        hashId: row.indentDetailsHashId,
                        currentIsVerified: row.isVerified,
                        projectId: row.projectHashId,
                        projectItemId: row.projectItemHashId,
                        basicRateId: row.basicRateHashId,
                        quantity: row.quantity,
                      })
                    }
                    disabled={checkMutation.isPending}
                    aria-busy={checkMutation.isPending}
                  >
                    Mark checked
                  </Button>
                )}
              </TableCell>
              <TableCell className='text-center'>
                {row.isVerified === 1 ? (
                  <Badge variant='secondary' className='gap-1'>
                    <IconCheck className='size-3' />
                    Verified
                  </Badge>
                ) : (
                  <Button
                    variant='outline'
                    onClick={() =>
                      verifyMutation.mutate({
                        hashId: row.indentDetailsHashId,
                        currentIsChecked: row.isChecked,
                        projectId: row.projectHashId,
                        projectItemId: row.projectItemHashId,
                        basicRateId: row.basicRateHashId,
                        quantity: row.quantity,
                      })
                    }
                    disabled={verifyMutation.isPending}
                    aria-busy={verifyMutation.isPending}
                  >
                    Mark verified
                  </Button>
                )}
              </TableCell>
              <TableCell className='text-sm text-muted-foreground'>
                {row.status ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
