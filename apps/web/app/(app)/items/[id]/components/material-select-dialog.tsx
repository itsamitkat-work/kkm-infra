'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BasicRate } from '@/hooks/useBasicRates';
import { BasicRatesTable } from '@/app/(app)/basic-rates/components/basic-rates-table';

interface MaterialSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (material: BasicRate) => void;
}

export function MaterialSelectDialog({
  open,
  onOpenChange,
  onSelect,
}: MaterialSelectDialogProps) {
  function handleSelectMaterial(material: BasicRate) {
    onSelect(material);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant='fullscreen'
        className='flex max-h-[100vh] flex-col'
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Select material</DialogTitle>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-auto'>
          <BasicRatesTable
            onSelectMaterial={handleSelectMaterial}
            inDialog
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
