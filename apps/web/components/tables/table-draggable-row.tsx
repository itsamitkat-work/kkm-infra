'use client';

import { flexRender, Row } from '@tanstack/react-table';

import { TableCell, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

type WithId = {
  id?: string;
  hashId?: string | null;
  hashID?: string; // Support for hashID (capital ID) used in some APIs
};

export function TableDraggableRow<T extends WithId>({
  row,
  showIndexColumn,
  style,
  totalColumnSize = 0,
}: {
  row: Row<T>;
  showIndexColumn?: boolean;
  style?: React.CSSProperties;
  totalColumnSize?: number;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id || row.original.hashId || '',
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className='relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80'
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
        ...style,
      }}
    >
      {showIndexColumn && (
        <TableCell className='text-center text-muted-foreground'>
          {row.index + 1}
        </TableCell>
      )}
      {row.getVisibleCells().map((cell) => {
        const columnSize = cell.column.getSize();
        const widthPercent =
          totalColumnSize > 0
            ? `${(columnSize / totalColumnSize) * 100}%`
            : `${columnSize}px`;
        const columnMeta = cell.column.columnDef.meta as
          | { cellClassName?: string }
          | undefined;
        return (
          <TableCell
            key={cell.id}
            style={{ width: widthPercent }}
            className={cn(
              'overflow-hidden',
              columnMeta?.cellClassName
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
