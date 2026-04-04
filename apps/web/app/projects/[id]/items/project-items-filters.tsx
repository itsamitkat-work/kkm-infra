import { FilterFieldConfig, FilterOption } from '@/components/ui/filters';

export const getProjectItemsFilters = (
  clientOptions: FilterOption[]
): FilterFieldConfig[] => {
  return [
    {
      key: 'code',
      label: 'Code',
      type: 'text',
    },
    {
      key: 'dsrCode',
      label: 'DSR Code',
      type: 'text',
    },
    {
      key: 'scheduleName',
      label: 'Schedule',
      type: 'multiselect',
      options: clientOptions,
    },
    {
      key: 'quantity',
      label: 'Quantity',
      type: 'number',
    },
    {
      key: 'total',
      label: 'Total',
      type: 'number',
    },
  ];
};
