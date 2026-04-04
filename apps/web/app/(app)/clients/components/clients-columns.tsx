'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Client } from '@/hooks/clients/use-clients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const getColumns = (
  onClientAction: (client: Client, mode: 'edit' | 'read') => void,
  onDeleteClient: (clientId: string) => void
): ColumnDef<Client>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Name' className='pl-2' />
    ),
    cell: ({ row }) => {
      const name = row.original.name;
      const fullName = row.original.fullName || '';
      return (
        <div className='pl-2'>
          <div className='block overflow-hidden text-ellipsis whitespace-nowrap'>
            {name}
          </div>
          {fullName && (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div className='text-xs text-muted-foreground truncate cursor-help mt-0.5'>
                  {fullName}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className='max-w-xs'>{fullName}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    },
    enableHiding: false,
    size: 200,
  },
  {
    accessorKey: 'scheduleName',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Schedule Name' />
    ),
    cell: ({ row }) => {
      return (
        <span className='block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          {row.original.scheduleName || ''}
        </span>
      );
    },
    size: 200,
  },
  {
    accessorKey: 'address',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Address' />
    ),
    cell: ({ row }) => {
      const address = row.original.address || '';
      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-sm text-muted-foreground truncate cursor-help'>
              {address || '—'}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className='max-w-xs'>{address || '—'}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 250,
  },
  {
    id: 'contact',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Contact' />
    ),
    cell: ({ row }) => {
      const mdcontact = row.original.mdcontact;
      const cpcontact = row.original.cpcontact;
      const contacts = [];

      if (mdcontact) {
        contacts.push(`MD: ${mdcontact}`);
      }
      if (cpcontact) {
        contacts.push(`CP: ${cpcontact}`);
      }

      const contactText = contacts.join('\n');

      return (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <div className='text-xs text-muted-foreground cursor-help'>
              {contacts.length > 0 ? (
                <div className='flex flex-col gap-1'>
                  {contacts.map((contact, index) => (
                    <div key={index} className='truncate'>
                      {contact}
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-muted-foreground'>—</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className='max-w-xs whitespace-pre-line'>{contactText || '—'}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    size: 200,
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
            onClick={() => onClientAction(row.original, 'edit')}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onClientAction(row.original, 'read')}
          >
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => onDeleteClient(row.original.hashId)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 50,
  },
];
