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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface BulkIncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  value: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  isValid: boolean;
}

export function BulkIncentiveDialog({
  open,
  onOpenChange,
  selectedCount,
  value,
  onValueChange,
  onSave,
  onClear,
  isValid,
}: BulkIncentiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl'>
            Add Incentive ({selectedCount}{' '}
            {selectedCount === 1 ? 'employee' : 'employees'})
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4 py-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='bulk-incentive' className='text-sm sm:text-base'>
              Incentive Amount (₹)
            </Label>
            <Input
              id='bulk-incentive'
              type='number'
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder='0'
              className={cn(
                'h-10 sm:h-11 text-sm sm:text-base',
                !isValid && 'border-destructive'
              )}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) {
                  onSave();
                }
              }}
            />
            {!isValid && (
              <p className='text-xs sm:text-sm text-destructive'>
                Please enter a valid number
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              Enter a positive value for incentive or negative for deduction.
              Leave empty to clear.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-10 sm:h-9 text-sm sm:text-sm'
          >
            Cancel
          </Button>
          <Button
            variant='outline'
            onClick={onClear}
            className='h-10 sm:h-9 text-sm sm:text-sm'
          >
            Clear All
          </Button>
          <Button
            onClick={onSave}
            disabled={!isValid}
            className='h-10 sm:h-9 text-sm sm:text-sm'
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
