'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Filter, Filters, FilterFieldConfig } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/search-input';
import { getPlatformSpecificKbd } from '@/lib/utils';
import type { Json } from '@kkm/db';
import {
  flattenItemDescription,
  parseItemDescriptionFromDb,
} from '@/app/(app)/schedule-items/item-description-doc';

export const filterFields: FilterFieldConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'cost-overrun', label: 'Cost Overrun' },
      { value: 'cost-savings', label: 'Cost Savings' },
    ],
  },
  {
    key: 'plannedQty',
    label: 'Planned Qty',
    type: 'number',
  },
];

export interface EstimationReportsFiltersProps {
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchInputRef?: React.Ref<HTMLInputElement>;
}

export function EstimationReportsFilters({
  filters,
  onFiltersChange,
  query,
  onQueryChange,
  searchInputRef,
}: EstimationReportsFiltersProps) {
  return (
    <div className='flex items-center gap-3 w-full'>
      <div className='relative flex-1 max-w-md'>
        <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <SearchInput
          ref={searchInputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder='Search by Wo. No. or Name'
          className='pl-8 h-8'
          onClear={() => onQueryChange('')}
          kbd={getPlatformSpecificKbd('K')}
        />
      </div>
      <Filters
        fields={filterFields}
        filters={filters}
        onChange={onFiltersChange}
        variant='outline'
        size='sm'
        className='gap-2'
        showAddButton={true}
      />
    </div>
  );
}

// Filter logic hook for reuse
export function useEstimationReportsFilters<
  T extends {
    id: string;
    contract_quantity?: string;
    estimate_quantity?: string;
    rate_amount?: string;
    item_description?: unknown;
    work_order_number?: string | number;
    costDeviation?: number;
  },
>(data: T[], initialFilters?: Filter[], initialQuery?: string) {
  const [filters, setFilters] = React.useState<Filter[]>(initialFilters || []);
  const [query, setQuery] = React.useState(initialQuery || '');

  const filteredItems = React.useMemo(() => {
    let result = data;

    // Apply search query first
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const name = flattenItemDescription(
          parseItemDescriptionFromDb(item.item_description as Json)
        ).toLowerCase();
        const wo = String(item.work_order_number ?? '').toLowerCase();
        return name.includes(q) || wo.includes(q);
      });
    }

    // Apply structured filters
    if (filters.length > 0) {
      result = result.filter((item) => {
        return filters.every((filter) => {
          const { field, operator, values } = filter;
          const [value] = values;

          switch (field) {
            case 'status': {
              const planned = parseFloat(item.contract_quantity || '0');
              const estimated = parseFloat(item.estimate_quantity || '0');
              const rate = parseFloat(item.rate_amount || '0');
              const costDev = (estimated - planned) * rate;

              let condition;
              if (value === 'cost-overrun') {
                condition = costDev > 0;
              } else if (value === 'cost-savings') {
                condition = costDev < 0;
              } else {
                condition = true;
              }

              if (operator === 'is') return condition;
              if (operator === 'is_not') return !condition;

              return true;
            }
            case 'costDeviation': {
              const costDev = item.costDeviation || 0;
              const valueNum = Number(value);

              if (operator !== 'between' && isNaN(valueNum)) {
                return true;
              }

              switch (operator) {
                case 'equals':
                  return costDev === valueNum;
                case 'not_equals':
                  return costDev !== valueNum;
                case 'greater_than':
                  return costDev > valueNum;
                case 'less_than':
                  return costDev < valueNum;
                case 'between': {
                  const min = Number(values[0]);
                  const max = Number(values[1]);
                  if (isNaN(min) || isNaN(max)) return true;
                  return costDev >= min && costDev <= max;
                }
                default:
                  return true;
              }
            }
            case 'plannedQty': {
              const plannedQty = parseFloat(item.contract_quantity || '0');
              const valueNum = Number(value);

              if (operator !== 'between' && isNaN(valueNum)) {
                return true;
              }

              switch (operator) {
                case 'equals':
                  return plannedQty === valueNum;
                case 'not_equals':
                  return plannedQty !== valueNum;
                case 'greater_than':
                  return plannedQty > valueNum;
                case 'less_than':
                  return plannedQty < valueNum;
                case 'between': {
                  const min = Number(values[0]);
                  const max = Number(values[1]);
                  if (isNaN(min) || isNaN(max)) return true;
                  return plannedQty >= min && plannedQty <= max;
                }
                default:
                  return true;
              }
            }
            default:
              return true;
          }
        });
      });
    }

    return result;
  }, [data, filters, query]);

  return {
    filters,
    onFiltersChange: setFilters,
    query,
    onQueryChange: setQuery,
    filteredItems,
  };
}
