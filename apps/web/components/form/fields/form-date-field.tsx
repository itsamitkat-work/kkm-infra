'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { DateField, DateInput } from '@/components/ui/datefield';
import {
  type DateValue,
  parseDate,
  getLocalTimeZone,
  CalendarDate,
} from '@internationalized/date';
import { Button } from '@/components/ui/button';

interface FormDateFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
}

export function FormDateField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required = false,
  className,
  readOnly = false,
}: FormDateFieldProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  const isIsoDate =
    typeof field.value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(field.value);
  const dateValue = isIsoDate ? parseDate(field.value) : null;

  function handleDateChange(newValue: DateValue | null) {
    field.onChange(newValue ? newValue.toString() : '');
  }

  function handleDateSelect(selectedDate: Date | undefined) {
    if (selectedDate) {
      const newDate = new CalendarDate(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
      field.onChange(newDate.toString());
      setOpen(false);
    }
  }

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && ' *'}
      </FieldLabel>
      <DateField
        value={dateValue}
        onChange={handleDateChange}
        isReadOnly={readOnly}
      >
        <div className='relative'>
          <DateInput className='bg-background pr-10' aria-invalid={!!error} />
          <Popover open={!readOnly && open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={readOnly}>
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 rounded-full'
                aria-label='Open calendar'
              >
                <CalendarIcon className='size-4 text-muted-foreground' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                selected={
                  dateValue
                    ? dateValue.toDate(getLocalTimeZone())
                    : undefined
                }
                onSelect={handleDateSelect}
                initialFocus
                defaultMonth={
                  dateValue
                    ? dateValue.toDate(getLocalTimeZone())
                    : undefined
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </DateField>
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
