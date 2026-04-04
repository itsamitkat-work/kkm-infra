'use client';

import { ColumnDef } from '@tanstack/react-table';
import { FactorRow } from '../hooks/use-factors-query';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const getColumns = (): ColumnDef<FactorRow>[] => [
  {
    accessorKey: 'factorName',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left pl-2'
        column={column}
        title='Factor'
      />
    ),
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();
      const count = row.original.materialCount || 0;
      return (
        <Button
          variant='ghost'
          size='sm'
          className='pl-2 h-auto w-full !justify-start hover:bg-muted/50 overflow-hidden text-left'
          onClick={() => row.toggleExpanded()}
        >
          <div className='flex items-center gap-2 min-w-0 w-full'>
            <Badge
              variant={count > 0 ? 'default' : 'secondary'}
              className={cn(
                'h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-medium flex-shrink-0',
                count > 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {count}
            </Badge>
            <div className='relative h-4 w-4 flex-shrink-0'>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-all duration-200 ease-in-out absolute',
                  isExpanded
                    ? 'rotate-0 opacity-100'
                    : 'rotate-[-90deg] opacity-0'
                )}
              />
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-all duration-200 ease-in-out absolute',
                  isExpanded ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                )}
              />
            </div>
            <span className='text-sm font-medium truncate min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left block'>
              {row.original.factorName || '-'}
            </span>
          </div>
        </Button>
      );
    },
    enableHiding: false,
    size: 220,
  },
  {
    accessorKey: 'materialCount',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Materials Count' />
    ),
    cell: ({ row }) => (
      <div className='text-sm'>{row.original.materialCount}</div>
    ),
    size: 160,
  },
];
