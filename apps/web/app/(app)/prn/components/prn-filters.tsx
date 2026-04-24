'use client';

import type { FilterFieldConfig, Filter } from '@/components/ui/filters';
import { createFilter } from '@/components/ui/filters';
import {
  getProjectFilterFieldConfig,
  createProjectFilterDefault,
} from '@/components/filters/project-filter';

export const ROLE_FILTER_KEY = 'role';

export function getPrnFilterFields(
  userRoles: string[]
): FilterFieldConfig[] {
  const roleField =
    userRoles.length > 1
      ? [
          {
            key: ROLE_FILTER_KEY,
            label: 'Role',
            type: 'select' as const,
            options: userRoles.map((r) => ({ value: r, label: r })),
            required: true,
          },
        ]
      : [];

  return [
    {
      group: 'Filters',
      fields: [
        getProjectFilterFieldConfig({ required: true }),
        ...roleField,
        {
          key: 'dateRange',
          label: 'Date Range',
          type: 'daterange',
          required: false,
          showOperatorDropdown: true,
        },
      ],
    },
  ];
}

export function getPrnDefaultFilters(userRoles: string[]): Filter[] {
  const base: Filter[] = [createProjectFilterDefault()];
  if (userRoles.length === 0) return base;
  const defaultRole = userRoles[0];
  return [...base, createFilter(ROLE_FILTER_KEY, 'is', [defaultRole])];
}
