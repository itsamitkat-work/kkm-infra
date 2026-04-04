'use client';

import { ColumnDef } from '@tanstack/react-table';
import { EmployeeType } from '../hooks/use-employee-types-query';
import { TableColumnHeader } from '@/components/tables/table-column-header';

export const getColumns = (): ColumnDef<EmployeeType>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TableColumnHeader
        className='text-left pl-2'
        column={column}
        title='Name'
      />
    ),
    cell: ({ row }) => (
      <div className='pl-2 text-sm font-medium'>{row.original.name || ''}</div>
    ),
    enableHiding: false,
    size: 300,
  },
];
