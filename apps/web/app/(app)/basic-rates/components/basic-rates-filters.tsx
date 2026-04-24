import { type FilterFieldConfig } from '@/components/ui/filters';
import {
  RECORD_STATUS_FILTER_OPTIONS,
  RecordStatusDot,
} from '@/components/ui/record-status-badge';
import { SlidersHorizontal } from 'lucide-react';

export function getBasicRatesFilterFields(
  typeOptions: Array<{ value: string; label: string }>,
  scheduleOptions: Array<{ value: string; label: string }>
): FilterFieldConfig[] {
  return [
    {
      group: 'Filters',
      fields: [
        {
          key: 'schedule_source_version_id',
          label: 'Schedule',
          type: 'select',
          options: scheduleOptions,
        },
        {
          key: 'status',
          label: 'Status',
          icon: <SlidersHorizontal />,
          type: 'multiselect',
          className: 'w-[180px]',
          selectedOptionsClassName: '-space-x-1',
          options: RECORD_STATUS_FILTER_OPTIONS.map(
            ({ value, label, dotClass }) => ({
              value,
              label,
              icon: <RecordStatusDot dotClass={dotClass} />,
            })
          ),
        },
        {
          key: 'types',
          label: 'Type',
          type: 'select',
          options: typeOptions,
        },
      ],
    },
  ];
}
