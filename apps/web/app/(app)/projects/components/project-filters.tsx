import { type Filter, type FilterFieldsConfig } from '@/components/ui/filters';
import { IconCalendar, IconCurrencyRupee } from '@tabler/icons-react';
import { SlidersHorizontal } from 'lucide-react';

const STATUS_ICON = (dotClass: string) => (
  <span
    className={`size-1.5 rounded-full border border-transparent ${dotClass}`}
    aria-hidden
  />
);

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Active', dotClass: 'bg-emerald-500' },
  { value: 'on_hold', label: 'On Hold', dotClass: 'bg-amber-500' },
  { value: 'closed', label: 'Closed', dotClass: 'bg-slate-500' },
] as const;

/** Initial URL/query state: Active only; status stays applied on the projects table. */
export const defaultProjectTableFilters: Filter[] = [
  {
    id: 'project-status-default',
    field: 'status',
    operator: 'is_any_of',
    values: ['active'],
  },
];

export const filterFields: FilterFieldsConfig = [
  {
    group: 'Filters',
    fields: [
      {
        key: 'status',
        label: 'Status',
        icon: <SlidersHorizontal />,
        type: 'multiselect',
        required: true,
        className: 'w-[180px]',
        selectedOptionsClassName: '-space-x-1',
        options: STATUS_FILTER_OPTIONS.map(({ value, label, dotClass }) => ({
          value,
          label,
          icon: STATUS_ICON(dotClass),
        })),
      },
      {
        key: 'dosRange',
        label: 'DOS',
        icon: <IconCalendar />,
        type: 'daterange',
      },
      {
        key: 'docRange',
        label: 'DOC',
        icon: <IconCalendar />,
        type: 'daterange',
      },
      {
        key: 'amount',
        label: 'Amount',
        icon: <IconCurrencyRupee />,
        type: 'number',
      },
    ],
  },
];
