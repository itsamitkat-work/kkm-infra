'use client';

import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DateRangeFilterProps {
  value: { from?: string; to?: string };
  onChange: (value: { from?: string; to?: string }) => void;
  onClear: () => void;
  placeholder?: string;
}

export const DateRangeFilter = React.memo(
  ({
    value,
    onChange,
    onClear,
    placeholder = 'Select date range',
  }: DateRangeFilterProps) => {
    const [isOpen, setIsOpen] = React.useState(false);

    // Convert string dates to Date objects for the calendar
    const dateRange: DateRange | undefined = React.useMemo(() => {
      if (!value.from && !value.to) return undefined;

      return {
        from: value.from ? new Date(value.from) : undefined,
        to: value.to ? new Date(value.to) : undefined,
      };
    }, [value.from, value.to]);

    const handleDateSelect = (range: DateRange | undefined) => {
      if (!range) {
        onChange({ from: undefined, to: undefined });
        return;
      }

      onChange({
        from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
        to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
      });
    };

    const hasValue = value.from || value.to;

    const displayText = React.useMemo(() => {
      if (!hasValue) return placeholder;

      if (value.from && value.to) {
        return `${format(new Date(value.from), 'MMM dd')} - ${format(
          new Date(value.to),
          'MMM dd'
        )}`;
      }

      if (value.from) {
        return `From ${format(new Date(value.from), 'MMM dd')}`;
      }

      if (value.to) {
        return `Until ${format(new Date(value.to), 'MMM dd')}`;
      }

      return placeholder;
    }, [value.from, value.to, hasValue, placeholder]);

    return (
      <div className='relative'>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className={cn(
                'w-[200px] justify-start text-left font-normal',
                !hasValue && 'text-muted-foreground',
                hasValue && 'pr-8'
              )}
            >
              <IconCalendar className='mr-2 h-4 w-4' />
              <span className='truncate'>{displayText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='range'
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              className='rounded-lg border shadow-sm'
            />
          </PopoverContent>
        </Popover>

        {hasValue && (
          <Button
            variant='ghost'
            className='absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0'
            onClick={onClear}
          >
            <IconX className='h-3 w-3' />
          </Button>
        )}
      </div>
    );
  }
);

DateRangeFilter.displayName = 'DateRangeFilter';
