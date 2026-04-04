'use client';

import * as React from 'react';
import {
  format,
  addDays,
  subDays,
  isToday,
  isYesterday,
  isTomorrow,
  startOfToday,
  isAfter,
  isSameDay,
} from 'date-fns';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { cn } from '@/lib/utils';
// Get friendly date label

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

// Date selector component with calendar popover
interface DateSelectorProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ date, onDateChange }: DateSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  function handlePrevDay() {
    onDateChange(subDays(date, 1));
  }

  function handleNextDay() {
    onDateChange(addDays(date, 1));
  }

  function handleToday() {
    onDateChange(startOfToday());
    setIsOpen(false);
  }

  function handleCalendarSelect(selectedDate: Date | undefined) {
    if (selectedDate) {
      onDateChange(selectedDate);
      setIsOpen(false);
    }
  }

  const dateLabel = getDateLabel(date);
  const isCurrentDay = isToday(date);

  return (
    <div className='flex items-center gap-2'>
      {/* Date display with calendar popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className={cn(
              'h-8 w-60 justify-start gap-2 px-3 font-medium',
              isCurrentDay && 'border-primary/50 bg-primary/5'
            )}
          >
            <IconCalendar className='size-4 text-muted-foreground shrink-0' />
            <span className='text-primary w-20 text-left'>{dateLabel}</span>
            <span className='text-muted-foreground'>•</span>
            <span>{format(date, 'd MMM yyyy')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <div className='flex flex-col'>
            {/* Quick actions */}
            <div className='flex items-center gap-1 border-b p-2'>
              <Button
                variant={isToday(date) ? 'primary' : 'ghost'}
                size='sm'
                className='h-7 px-2 text-xs'
                onClick={handleToday}
              >
                Today
              </Button>
              <Button
                variant={isYesterday(date) ? 'primary' : 'ghost'}
                size='sm'
                className='h-7 px-2 text-xs'
                onClick={() => {
                  onDateChange(subDays(startOfToday(), 1));
                  setIsOpen(false);
                }}
              >
                Yesterday
              </Button>
            </div>
            {/* Calendar */}
            <Calendar
              mode='single'
              selected={date}
              onSelect={handleCalendarSelect}
              defaultMonth={date}
              disabled={{ after: new Date() }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Prev/Next day buttons */}
      <div className='flex items-center'>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 rounded-r-none'
          onClick={handlePrevDay}
        >
          <IconChevronLeft className='size-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 rounded-l-none'
          onClick={handleNextDay}
          disabled={isAfter(date, new Date()) || isSameDay(date, new Date())}
        >
          <IconChevronRight className='size-4' />
        </Button>
      </div>
    </div>
  );
}
