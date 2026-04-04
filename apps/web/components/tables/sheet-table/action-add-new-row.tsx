'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function ActionAddNewRow({
  onAddNewRow,
  colSpan,
  dense,
}: {
  onAddNewRow?: () => void;
  colSpan: number;
  dense: boolean;
}) {
  if (!onAddNewRow) {
    return null;
  }

  return (
    <TableRow className='border-none hover:bg-muted/50'>
      <TableCell
        colSpan={colSpan}
        className={cn(
          'text-center py-2 transition-colors',
          dense ? 'text-sm' : ''
        )}
      >
        <button
          type='button'
          tabIndex={0}
          data-add-new-row
          className={cn(
            'w-full py-2 px-4 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors',
            'text-muted-foreground hover:text-foreground focus:text-foreground'
          )}
          onClick={() => onAddNewRow()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAddNewRow();
            }
          }}
          aria-label='Add new item to table'
        >
          <div className='flex items-center justify-center gap-2'>
            <Plus size={16} />
            <span>Add New Item</span>
          </div>
        </button>
      </TableCell>
    </TableRow>
  );
}
