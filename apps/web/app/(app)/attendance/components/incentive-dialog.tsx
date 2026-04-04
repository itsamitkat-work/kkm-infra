'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  calculateWorkedHours,
  calculateOvertimeHours,
} from '../config/attendance-config';
import { useAttendanceConfig } from '../hooks/use-attendance-config';
import { cn } from '@/lib/utils';
import { IconEdit, IconCheck, IconX } from '@tabler/icons-react';

interface IncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clockIn: string | null;
  clockOut: string | null;
  currentIncentive: number | null;
  onSave: (incentive: number | null) => void;
}

export function IncentiveDialog({
  open,
  onOpenChange,
  clockIn,
  clockOut,
  currentIncentive,
  onSave,
}: IncentiveDialogProps) {
  const { config } = useAttendanceConfig();
  const workedHours = calculateWorkedHours(clockIn, clockOut);
  const overtimeHours = config?.global
    ? calculateOvertimeHours(clockIn, clockOut, config.global)
    : null;

  // State for rate editing
  const [isEditingRate, setIsEditingRate] = React.useState(false);
  const [ratePerHour, setRatePerHour] = React.useState<number>(
    config?.global.incentiveRatePerHour.overtime ?? 50
  );
  const [editRateValue, setEditRateValue] = React.useState<string>(
    (config?.global.incentiveRatePerHour.overtime ?? 50).toString()
  );
  const rateInputRef = React.useRef<HTMLInputElement>(null);

  // Calculate incentive based on overtime/undertime and current rate
  const autoCalculatedIncentive =
    overtimeHours !== null ? Math.round(overtimeHours * ratePerHour) : null;

  const [incentiveValue, setIncentiveValue] = React.useState<string>(
    currentIncentive?.toString() ?? autoCalculatedIncentive?.toString() ?? ''
  );

  React.useEffect(() => {
    // Update local value when dialog opens or current incentive changes
    if (open && config) {
      const initialRate = config.global.incentiveRatePerHour.overtime;
      setRatePerHour(initialRate);
      setEditRateValue(initialRate.toString());
      setIsEditingRate(false);
      const initialOvertimeHours = calculateOvertimeHours(
        clockIn,
        clockOut,
        config.global
      );
      const initialCalculated =
        initialOvertimeHours !== null
          ? Math.round(initialOvertimeHours * initialRate)
          : null;
      setIncentiveValue(
        currentIncentive?.toString() ?? initialCalculated?.toString() ?? ''
      );
    }
  }, [open, currentIncentive, config, clockIn, clockOut]);

  React.useEffect(() => {
    if (isEditingRate && rateInputRef.current) {
      rateInputRef.current.focus();
      rateInputRef.current.select();
    }
  }, [isEditingRate]);

  // Recalculate incentive when rate changes
  React.useEffect(() => {
    if (overtimeHours !== null && open) {
      // Always update incentive amount when rate changes
      const newCalculated = Math.round(overtimeHours * ratePerHour);
      setIncentiveValue(newCalculated.toString());
    }
  }, [ratePerHour, overtimeHours, open]);

  function handleRateEdit() {
    setIsEditingRate(true);
    setEditRateValue(ratePerHour.toString());
  }

  function handleRateSave() {
    const numValue = parseInt(editRateValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setRatePerHour(numValue);
      setIsEditingRate(false);
    }
  }

  function handleRateCancel() {
    setEditRateValue(ratePerHour.toString());
    setIsEditingRate(false);
  }

  function handleRateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleRateSave();
    } else if (e.key === 'Escape') {
      handleRateCancel();
    }
  }

  function handleSave() {
    const numValue = incentiveValue === '' ? null : parseFloat(incentiveValue);
    // Allow negative values (for undertime deductions)
    if (
      incentiveValue === '' ||
      (!isNaN(numValue as number) && numValue !== null)
    ) {
      onSave(numValue);
      onOpenChange(false);
    }
  }

  function handleClear() {
    setIncentiveValue('');
    onSave(null);
    onOpenChange(false);
  }

  const isValid =
    incentiveValue === '' ||
    (!isNaN(parseFloat(incentiveValue)) && incentiveValue !== '-');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl'>
            Set Incentive
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-3 sm:gap-4 py-2 sm:py-4'>
          {/* Worked hours and overtime/undertime info */}
          {workedHours !== null ? (
            <div className='rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground text-xs sm:text-sm'>
                  Worked Hours:
                </span>
                <span className='font-medium text-sm sm:text-base'>
                  {workedHours.toFixed(2)}h
                </span>
              </div>
              {overtimeHours !== null && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground text-xs sm:text-sm'>
                    {overtimeHours >= 0 ? 'Overtime:' : 'Undertime:'}
                  </span>
                  <span
                    className={cn(
                      'font-medium text-sm sm:text-base',
                      overtimeHours >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {overtimeHours >= 0 ? '+' : ''}
                    {overtimeHours.toFixed(2)}h
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className='rounded-lg border border-dashed bg-muted/30 p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground'>
              Clock in and out times are required to calculate incentive
            </div>
          )}

          {/* Rate per hour - editable with edit button */}
          <div className='flex flex-col gap-2'>
            <Label className='text-xs sm:text-sm text-muted-foreground'>
              Incentive Rate per Hour (₹)
            </Label>
            {isEditingRate ? (
              <div className='flex items-center gap-1 sm:gap-2'>
                <Input
                  ref={rateInputRef}
                  type='number'
                  value={editRateValue}
                  onChange={(e) => setEditRateValue(e.target.value)}
                  onKeyDown={handleRateKeyDown}
                  onBlur={handleRateSave}
                  min={0}
                  className='h-9 sm:h-10 flex-1 text-sm sm:text-base'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 sm:size-9'
                  onClick={handleRateSave}
                >
                  <IconCheck className='size-3 sm:size-4 text-emerald-600' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 sm:size-9'
                  onClick={handleRateCancel}
                >
                  <IconX className='size-3 sm:size-4 text-muted-foreground' />
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-2 h-9 sm:h-10 px-3 rounded-md border bg-background'>
                <span className='flex-1 text-sm sm:text-base font-medium'>
                  ₹{ratePerHour}/hr
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7 sm:size-8'
                  onClick={handleRateEdit}
                >
                  <IconEdit className='size-3 sm:size-3.5 text-muted-foreground' />
                </Button>
              </div>
            )}
          </div>

          {/* Auto-calculated display */}
          {overtimeHours !== null && autoCalculatedIncentive !== null && (
            <div className='rounded-lg border bg-muted/30 p-3 sm:p-4'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground text-xs sm:text-sm'>
                  Auto-calculated:
                </span>
                <span
                  className={cn(
                    'font-medium text-sm sm:text-base',
                    autoCalculatedIncentive >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  )}
                >
                  {autoCalculatedIncentive >= 0 ? '+' : ''}₹
                  {autoCalculatedIncentive}
                </span>
              </div>
            </div>
          )}

          {/* Incentive input */}
          <div className='flex flex-col gap-2'>
            <Label htmlFor='incentive' className='text-sm sm:text-base'>
              Incentive Amount (₹)
            </Label>
            <Input
              id='incentive'
              type='number'
              value={incentiveValue}
              onChange={(e) => setIncentiveValue(e.target.value)}
              placeholder={autoCalculatedIncentive?.toString() ?? '0'}
              className={cn(
                'h-10 sm:h-11 text-sm sm:text-base',
                !isValid && 'border-destructive'
              )}
              // Allow negative values for undertime deductions
            />
            {!isValid && (
              <p className='text-xs sm:text-sm text-destructive'>
                Please enter a valid number
              </p>
            )}
          </div>
        </div>

        <div className='flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t mt-4 sm:mt-6'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='w-full sm:w-auto h-10 sm:h-9 text-sm sm:text-sm'
          >
            Cancel
          </Button>
          {currentIncentive !== null && (
            <Button
              variant='outline'
              onClick={handleClear}
              className='w-full sm:w-auto h-10 sm:h-9 text-sm sm:text-sm'
            >
              Clear
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className='w-full sm:w-auto h-10 sm:h-9 text-sm sm:text-sm'
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
