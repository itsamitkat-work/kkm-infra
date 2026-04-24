'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DataTableControls } from './use-data-table-controls';
import { FilterFieldsConfig, Filters } from '@/components/ui/filters';
import { cn } from '@/lib/utils';
import { FunnelX } from 'lucide-react';

export function DataTableFilters({
  controls,
  filterFields,
  showAddButton = true,
  showClearButton = true,
  className,
  inline = false,
}: {
  filterFields: FilterFieldsConfig;
  controls: DataTableControls;
  showAddButton?: boolean;
  showClearButton?: boolean;
  className?: string;
  /** Single row with search: no full-width grow, sits after search input. */
  inline?: boolean;
}) {
  const { filters, handleFiltersChange } = controls;

  return (
    <div
      className={cn(
        inline
          ? 'flex shrink-0 items-center gap-2 min-w-0'
          : 'flex items-start gap-2.5 grow space-y-6 self-start content-start flex-wrap',
        className
      )}
    >
      <div className={cn(!inline && 'flex-1 mb-0')}>
        <Filters
          filters={filters}
          fields={filterFields || []}
          variant='outline'
          onChange={handleFiltersChange}
          showAddButton={showAddButton}
        />
      </div>

      {showClearButton && filters.length > 0 && (
        <Button variant='outline' onClick={() => handleFiltersChange([])}>
          <FunnelX /> Clear
        </Button>
      )}
    </div>
  );
}
