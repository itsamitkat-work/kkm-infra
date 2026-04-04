'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ProjectSegment } from '@/types/projects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import {
  calculateDaysRemaining,
  calculateDuration,
  formatDate,
} from '@/lib/utils';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { StatusBadge } from '@/components/ui/status-badge';

export const getSegmentColumns = (
  onEdit: (segment: ProjectSegment) => void,
  onView: (segment: ProjectSegment) => void,
  onDelete: (segment: ProjectSegment) => void
): ColumnDef<ProjectSegment>[] => [
  {
    accessorKey: 'displayOrder',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='#' className='text-center' />
    ),
    cell: ({ row }) => (
      <div className='text-center text-muted-foreground font-medium'>
        {row.original.displayOrder}
      </div>
    ),
    size: 60,
    enableHiding: true,
  },
  {
    accessorKey: 'segmentName',
    header: ({ column }) => <TableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => {
      const segment = row.original;
      return (
        <div className='flex flex-col min-w-0'>
          <TooltipProvider>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <span className='font-medium truncate block'>
                  {segment.segmentName}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{segment.segmentName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {segment.description && (
            <TooltipProvider>
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <span className='text-sm text-muted-foreground truncate block'>
                    {segment.description}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{segment.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
    enableHiding: false,
    size: 400,
  },
  {
    accessorKey: 'segmentType',
    header: ({ column }) => <TableColumnHeader column={column} title='Type' />,
    cell: ({ row }) => (
      <Badge variant='outline' className='text-xs'>
        {row.original.segmentType}
      </Badge>
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
    id: 'dates',
    header: 'Dates',
    cell: ({ row }) => {
      const segment = row.original;

      const duration = calculateDuration(
        segment.startDate ?? null,
        segment.endDate ?? null
      );
      const daysRemaining = calculateDaysRemaining(segment.endDate ?? null);

      return (
        <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
          {segment.startDate && (
            <div className='flex items-center gap-1.5 truncate'>
              <TooltipProvider>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <span className='truncate'>
                      {formatDate(segment.startDate)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className='space-y-1'>
                      <p>Duration: {duration}</p>
                      <p>{daysRemaining}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {segment.endDate && (
            <div className='flex items-center gap-1.5 truncate'>
              <TooltipProvider>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <span className='truncate'>
                      {formatDate(segment.endDate)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className='space-y-1'>
                      <p>Duration: {duration}</p>
                      <p>{daysRemaining}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {!segment.startDate && !segment.endDate && (
            <span className='text-muted-foreground/50'>—</span>
          )}
        </div>
      );
    },
    size: 180,
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
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onView(row.original)}>
            View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => onDelete(row.original)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 60,
  },
];
