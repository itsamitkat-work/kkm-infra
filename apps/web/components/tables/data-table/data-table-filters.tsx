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
}: {
  filterFields: FilterFieldsConfig;
  controls: DataTableControls;
  showAddButton?: boolean;
  showClearButton?: boolean;
  className?: string;
}) {
  const { filters, handleFiltersChange } = controls;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 grow space-y-6 self-start content-start flex-wrap',
        className
      )}
    >
      <div className='flex-1 mb-0'>
        <Filters
          filters={filters}
          fields={filterFields || []}
          variant='outline'
          onChange={handleFiltersChange}
          size='sm'
          showAddButton={showAddButton}
        />
      </div>

      {showClearButton && filters.length > 0 && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => handleFiltersChange([])}
        >
          <FunnelX /> Clear
        </Button>
      )}
    </div>
  );
}
