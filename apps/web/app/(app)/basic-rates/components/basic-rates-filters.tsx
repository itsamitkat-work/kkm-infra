import { type FilterFieldConfig } from '@/components/ui/filters';
import {
  RECORD_STATUS_FILTER_OPTIONS,
  RecordStatusDot,
} from '@/components/ui/record-status-badge';

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
          key: 'basic_rate_type_id',
          label: 'Type',
          type: 'select',
          options: typeOptions,
        },
      ],
    },
  ];
}
