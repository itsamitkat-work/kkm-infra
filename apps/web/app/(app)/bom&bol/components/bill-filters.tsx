'use client';

import type { FilterFieldConfig } from '@/components/ui/filters';
import { createFilter } from '@/components/ui/filters';
import {
  getProjectFilterFieldConfig,
  createProjectFilterDefault,
} from '@/components/filters/project-filter';

const ITEM_TYPE_OPTIONS = [
  { value: 'planned', label: 'Project Items' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'measurement', label: 'Measurement' },
] as const;

export function getBillFilterFields(): FilterFieldConfig[] {
  return [
    {
      group: 'Filters',
      fields: [
        getProjectFilterFieldConfig({ required: true }),
        {
          key: 'itemType',
          label: 'Item Type',
          type: 'select',
          required: true,
          options: [...ITEM_TYPE_OPTIONS],
        },
      ],
    },
  ];
}

const DEFAULT_ITEM_TYPE = '';

export function getBillDefaultFilters() {
  return [
    createProjectFilterDefault(),
    createFilter('itemType', 'is', [DEFAULT_ITEM_TYPE]),
  ];
}
