'use client';

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DeviationResponse } from './types';

interface DeviationRowProps {
  item: DeviationResponse;
  index: number;
}

export function DeviationRow({ item, index }: DeviationRowProps) {
  const rate = item.rate || 0;
  const quantity1 = item.quantity1 || 0;
  const quantity2 = item.quantity2 || 0;
  const amount1 = (quantity1 || 0) * (rate || 0);
  const amount2 = (quantity2 || 0) * (rate || 0);
  const deviationQty = quantity2 - quantity1;
  const deviationAmount = (deviationQty || 0) * (rate || 0);
  const devSeverity: 'error' | 'success' | 'neutral' =
    deviationQty > 0 ? 'error' : deviationQty < 0 ? 'success' : 'neutral';

  const deviationClass =
    devSeverity === 'error'
      ? 'text-destructive'
      : devSeverity === 'success'
        ? 'text-chart-2'
        : 'text-muted-foreground';
  return (
    <React.Fragment>
      <TableRow>
        <TableCell className='text-center border-r text-muted-foreground  leading-tight'>
          {index + 1}
        </TableCell>
        <TableCell className='text-center border-r text-muted-foreground py-0.5 px-2 leading-tight'>
          {item.srNo}
        </TableCell>
        <TableCell className='font-medium border-r w-[400px] truncate py-0.5 px-2 leading-tight'>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='truncate block'>{item.name}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className='text-right tabular-nums border-r text-muted-foreground py-0.5 px-2 leading-tight'>
          {quantity1}
        </TableCell>
        <TableCell className='text-right tabular-nums border-r text-muted-foreground py-0.5 px-2 leading-tight'>
          {amount1.toFixed(2)}
        </TableCell>
        <TableCell className='text-right tabular-nums border-r text-muted-foreground py-0.5 px-2 leading-tight'>
          {quantity2}
        </TableCell>
        <TableCell className='text-right tabular-nums border-r text-muted-foreground py-0.5 px-2 leading-tight'>
          {amount2.toFixed(2)}
        </TableCell>
        <TableCell className='text-right border-r py-0.5 px-2'>
          <div
            className={`flex items-center justify-end gap-1 text-xs ${deviationClass}`}
          >
            {deviationQty > 0 ? (
              <ArrowUpRight className='h-3.5 w-3.5' />
            ) : deviationQty < 0 ? (
              <ArrowDownRight className='h-3.5 w-3.5' />
            ) : null}
            <span className='tabular-nums font-medium'>
              ₹{(Math.abs(deviationAmount) / 100000).toFixed(2)}L
            </span>
            <span className='tabular-nums text-muted-foreground'>
              ({Math.abs(deviationQty).toFixed(2)})
            </span>
          </div>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}
