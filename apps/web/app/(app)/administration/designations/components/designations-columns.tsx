'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Designation } from '../hooks/use-designations-query';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconDotsVertical } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const getColumns = (
  onDesignationAction: (designation: Designation, mode: 'edit' | 'read') => void,
  onDeleteDesignation: (hashId: string) => void
): ColumnDef<Designation>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left pl-2'
        column={column}
        title='Name'
      />
    ),
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();
      const count = row.original.subDesignationsCount || 0;
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
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <span className='text-sm font-medium truncate min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left block'>
                  {row.original.name || ''}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.original.name || ''}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </Button>
      );
    },
    enableHiding: false,
    size: 200,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <TableColumnHeader className='text-left' column={column} title='Code' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.code || ''}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: 'employeeTypeName',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left'
        column={column}
        title='Employee Type'
      />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.employeeTypeName || ''}
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'basicRate',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left'
        column={column}
        title='Basic Rate'
      />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.original.basicRate || ''}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 120,
  },

  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='data-[state=open]:bg-muted text-muted-foreground flex size-8'
            size='icon'
          >
            <IconDotsVertical />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem
            onClick={() => onDesignationAction(row.original, 'edit')}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDesignationAction(row.original, 'read')}
          >
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => onDeleteDesignation(row.original.hashId)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
