'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  type BasicRate,
  BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME,
} from '@/app/(app)/basic-rates/api/basic-rate-api';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import {
  TextCell,
  TableRowActionsMenuCell,
} from '@/components/tables/table-cells';
import {
  RecordStatusBadge,
  formatRecordStatusLabel,
} from '@/components/ui/record-status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const getColumns = (
  onBasicRateAction: (basicRate: BasicRate, mode: 'edit' | 'read') => void,
  onDeleteBasicRate: (id: string) => void,
  onSelectMaterial: ((basicRate: BasicRate) => void) | undefined,
  canManage: boolean
): ColumnDef<BasicRate>[] => [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Code' className='pl-2' />
    ),
    cell: ({ row }) => (
      <TextCell
        label={row.original.code || '—'}
        onClick={() => {
          onBasicRateAction(row.original, 'read');
        }}
        emphasis
        className='pl-2'
        buttonClassName='text-foreground hover:text-primary'
        muted={false}
      />
    ),
    enableHiding: false,
    size: 100,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Description' />
    ),
    meta: {
      cellClassName: '!whitespace-normal',
    },
    cell: ({ row }) => (
      <TextCell
        label={row.original.description || '—'}
        variant='description'
        onClick={
          onSelectMaterial
            ? () => {
                onSelectMaterial(row.original);
              }
            : undefined
        }
        muted={false}
      />
    ),
    size: 250,
  },
  {
    accessorKey: 'basic_rate_type_id',
    header: ({ column }) => <TableColumnHeader column={column} title='Type' />,
    cell: ({ row }) => (
      <TextCell label={row.original.basic_rate_types?.name ?? '—'} />
    ),
    size: 120,
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => <TableColumnHeader column={column} title='Unit' />,
    cell: ({ row }) => <TextCell label={row.original.unit || '—'} />,
    size: 80,
  },
  {
    accessorKey: 'rate',
    header: ({ column }) => <TableColumnHeader column={column} title='Rate' />,
    cell: ({ row }) => (
      <TextCell label={`₹${row.original.rate?.toLocaleString('en-IN')}`} />
    ),
    size: 120,
  },
  {
    id: BASIC_RATES_SORT_KEY_SCHEDULE_DISPLAY_NAME,
    accessorFn: (row) =>
      row.schedule_source_versions?.display_name ??
      row.schedule_source_versions?.name ??
      '',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Schedule' />
    ),
    cell: ({ row }) => {
      const scheduleLabel =
        row.original.schedule_source_versions?.display_name ??
        row.original.schedule_source_versions?.name ??
        '—';
      return <TextCell label={scheduleLabel} />;
    },
    size: 150,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <TableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className='min-w-0'>
            <RecordStatusBadge status={row.original.status} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className='text-sm'>
            {formatRecordStatusLabel(row.original.status)}
          </p>
        </TooltipContent>
      </Tooltip>
    ),
    size: 100,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <TableRowActionsMenuCell
        items={[
          ...(canManage
            ? [
                {
                  type: 'item' as const,
                  key: 'edit',
                  label: 'Edit',
                  onSelect: () => {
                    onBasicRateAction(row.original, 'edit');
                  },
                },
              ]
            : []),
          {
            type: 'item' as const,
            key: 'view',
            label: 'View Details',
            onSelect: () => {
              onBasicRateAction(row.original, 'read');
            },
          },
          ...(canManage
            ? [
                { type: 'separator' as const, key: 'sep-before-delete' },
                {
                  type: 'item' as const,
                  key: 'delete',
                  label: 'Delete',
                  destructive: true,
                  onSelect: () => {
                    onDeleteBasicRate(row.original.id);
                  },
                },
              ]
            : []),
        ]}
      />
    ),
    size: 50,
  },
];
