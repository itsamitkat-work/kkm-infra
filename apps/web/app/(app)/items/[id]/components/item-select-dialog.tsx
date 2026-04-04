'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MasterItem } from '@/hooks/items/types';
import {
  ItemsTable,
  SERVICE_ITEMS_FILTERS,
} from '@/app/(app)/items/components/items-table';
import type { Filter } from '@/components/ui/filters';

const ITEMS_SELECT_TABLE_ID = 'items-select';

interface ItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (itemId: string, item: MasterItem) => void;
  /** When set, table shows only service items (ScheduleRate=Service Items) */
  serviceItemsOnly?: boolean;
  /** Override default filters when serviceItemsOnly is false */
  defaultFilters?: Filter[];
}

export function ItemSelectDialog({
  open,
  onOpenChange,
  onSelect,
  serviceItemsOnly = false,
  defaultFilters,
}: ItemSelectDialogProps) {
  function handleSelectItem(item: MasterItem) {
    onSelect(item.hashId, item);
    onOpenChange(false);
  }

  const tableId = serviceItemsOnly ? ITEMS_SELECT_TABLE_ID : undefined;
  const filters = serviceItemsOnly ? SERVICE_ITEMS_FILTERS : defaultFilters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant='fullscreen'
        className='flex max-h-[100vh] flex-col'
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            {serviceItemsOnly ? 'Select service item' : 'Select item'}
          </DialogTitle>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-auto'>
          <ItemsTable
            onSelectItem={handleSelectItem}
            inDialog
            tableId={tableId}
            defaultFilters={filters}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
