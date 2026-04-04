import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  alignment?: 'start' | 'center' | 'end';
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  alignment = 'start',
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div
      className={cn(
        'flex items-center space-x-2',
        alignment === 'end'
          ? 'justify-end'
          : alignment === 'center'
            ? 'justify-center'
            : 'justify-start',
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 data-[state=open]:bg-accent w-full group',
              alignment === 'end' ? 'justify-end' : 'justify-start'
            )}
          >
            <span className='truncate'>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className='ml-2 h-4 w-4 flex-shrink-0' />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className='ml-2 h-4 w-4 flex-shrink-0' />
            ) : (
              <ChevronsUpDown className='ml-2 h-4 w-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={alignment === 'end' ? 'end' : 'start'}>
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
