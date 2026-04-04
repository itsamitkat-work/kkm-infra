import { type FilterFieldConfig } from '@/components/ui/filters';
import {
  IconSearch,
  IconFileText,
  IconHash,
  IconBox,
  IconCategory,
  IconTags,
} from '@tabler/icons-react';

export const getItemFilterFields = (
  materialTypes: Array<{ value: string; label: string }>,
  materialGroups: Array<{ value: string; label: string }>,
  materialCategories: Array<{ value: string; label: string }>
): FilterFieldConfig[] => [
  {
    key: 'searchField',
    label: 'Search Field',
    icon: <IconSearch />,
    type: 'select',
    className: 'w-[180px]',
    options: [
      { value: 'name', label: 'Item Name' },
      { value: 'code', label: 'Item Code' },
    ],
  },
  {
    key: 'Code',
    label: 'Code',
    icon: <IconHash />,
    type: 'text',
    placeholder: 'Filter by code...',
    className: 'w-[180px]',
  },
  {
    key: 'ScheduleRate',
    label: 'Schedule',
    icon: <IconFileText />,
    type: 'text',
    placeholder: 'Filter by schedule...',
    className: 'w-[180px]',
  },
  {
    key: 'MaterialTypeHashId',
    label: 'Material Type',
    icon: <IconBox />,
    type: 'select',
    className: 'w-[180px]',
    options: materialTypes,
  },
  {
    key: 'MaterialGroupHashId',
    label: 'Material Group',
    icon: <IconCategory />,
    type: 'select',
    className: 'w-[180px]',
    options: materialGroups,
  },
  {
    key: 'MaterialCategoryHashId',
    label: 'Material Category',
    icon: <IconTags />,
    type: 'select',
    className: 'w-[180px]',
    options: materialCategories,
  },
];
