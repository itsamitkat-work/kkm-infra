'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ReleaseToPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isReleasing: boolean;
}

export function ReleaseToPoolDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isReleasing,
}: ReleaseToPoolDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl'>
            Release to Pool ({selectedCount}{' '}
            {selectedCount === 1 ? 'employee' : 'employees'})
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4 py-4'>
          <p className='text-sm text-muted-foreground'>
            Are you sure you want to release{' '}
            <span className='font-medium text-foreground'>
              {selectedCount} {selectedCount === 1 ? 'employee' : 'employees'}
            </span>{' '}
            back to the pool?
          </p>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-10 sm:h-9 text-sm sm:text-sm'
            disabled={isReleasing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isReleasing}
            className='h-10 sm:h-9 text-sm sm:text-sm'
          >
            {isReleasing ? 'Releasing...' : 'Confirm Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
