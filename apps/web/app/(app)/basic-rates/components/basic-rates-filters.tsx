import { type FilterFieldConfig } from '@/components/ui/filters';

export const BASIC_RATE_TYPE_OPTIONS = [
  { value: 'Material', label: 'Material' },
  { value: 'Labour', label: 'Labour' },
  { value: 'Carrige', label: 'Carrige' },
] as const;

export const filterFields: FilterFieldConfig[] = [
  {
    group: 'Filters',
    fields: [
      {
        key: 'types',
        label: 'Type',
        type: 'select',
        options: [...BASIC_RATE_TYPE_OPTIONS],
      },

      {
        key: 'code',
        label: 'Code',
        type: 'text',
        placeholder: 'Filter by code',
      },
    ],
  },
];

export function getBasicRatesFilterFields(
  materialTypes: Array<{ value: string; label: string }>,
  materialGroups: Array<{ value: string; label: string }>,
  materialCategories: Array<{ value: string; label: string }>
): FilterFieldConfig[] {
  return [
    {
      group: 'Filters',
      fields: [
        {
          key: 'types',
          label: 'Type',
          type: 'select',
          options: [...BASIC_RATE_TYPE_OPTIONS],
        },

        {
          key: 'code',
          label: 'Code',
          type: 'text',
          placeholder: 'Filter by code',
        },
      ],
    },
    {
      group: 'Master Types',
      fields: [
        {
          key: 'MaterialTypeHashId',
          label: 'Material Type',
          type: 'select',
          options: materialTypes,
        },
        {
          key: 'MaterialGroupHashId',
          label: 'Material Group',
          type: 'select',
          options: materialGroups,
        },
        {
          key: 'MaterialCategoryHashId',
          label: 'Material Category',
          type: 'select',
          options: materialCategories,
        },
      ],
    },
  ];
}
