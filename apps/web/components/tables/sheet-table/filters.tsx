'use client';

import React from 'react';
import { UseSheetTableReturn } from './hooks/use-sheet-table';
import { Filters as AdvancedFilters } from '@/components/ui/filters';
import { type FilterFieldConfig } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/search-input';

type Props<T extends Record<string, unknown>> = {
  searchConfig?: {
    placeholder?: string;
    enabled?: boolean;
    kbd?: string;
  };
  filters: FilterFieldConfig[] | undefined;
  actions: React.ReactNode;
  sheetTable: UseSheetTableReturn<T>;
  searchInputRef?: React.Ref<HTMLInputElement>;
};

export function Filters<T extends Record<string, unknown>>({
  searchConfig = { enabled: true, placeholder: 'Search...' },
  filters,
  actions,
  sheetTable,
  searchInputRef,
}: Props<T>) {
  const { searchValue, setSearchValue } = sheetTable;
  const { filterFields, appliedFilters, handleFiltersChange } = sheetTable;

  return (
    <div>
      {(searchConfig.enabled || (filters && filters.length > 0)) && (
        <div className='flex flex-col gap-3'>
          <div className='flex items-start gap-3'>
            <div className='flex flex-1 flex-wrap items-center gap-2'>
              {searchConfig.enabled && (
                <SearchInput
                  ref={searchInputRef}
                  placeholder={searchConfig.placeholder || 'Search...'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className='min-w-48 sm:min-w-64 max-w-sm shrink-0'
                  onClear={() => setSearchValue('')}
                  kbd={searchConfig.kbd}
                />
              )}
              <AdvancedFilters
                fields={filterFields || []}
                filters={appliedFilters}
                onChange={(applied) => {
                  handleFiltersChange(applied);
                }}
              />
            </div>

            {actions && (
              <div className='flex shrink-0 items-center gap-2'>{actions}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
