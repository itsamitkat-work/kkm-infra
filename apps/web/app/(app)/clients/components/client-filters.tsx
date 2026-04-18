import { type FilterFieldConfig } from '@/components/ui/filters';
import { RecordStatusDot } from '@/components/ui/record-status-badge';
import { SlidersHorizontal } from 'lucide-react';

const CLIENT_STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Active', dotClass: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', dotClass: 'bg-slate-500' },
];

export const filterFields: FilterFieldConfig[] = [
  {
    group: 'Filters',
    fields: [
      {
        key: 'status',
        label: 'Status',
        icon: <SlidersHorizontal />,
        type: 'multiselect',
        className: 'w-[180px]',
        selectedOptionsClassName: '-space-x-1',
        options: CLIENT_STATUS_FILTER_OPTIONS.map(
          ({ value, label, dotClass }) => ({
            value,
            label,
            icon: <RecordStatusDot dotClass={dotClass} />,
          })
        ),
      },
    ],
  },
];
