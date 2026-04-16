'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

const FORM_SELECT_CLEAR_SENTINEL = '__form_select_clear__';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  className?: string;
  readOnly?: boolean;
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
}

export function FormSelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  options,
  required = false,
  className,
  readOnly = false,
  renderOption,
  renderValue,
}: FormSelectFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && ' *'}
      </FieldLabel>
      <Select
        onValueChange={(v) =>
          field.onChange(v === FORM_SELECT_CLEAR_SENTINEL ? '' : v)
        }
        value={
          field.value === undefined || field.value === null
            ? ''
            : String(field.value)
        }
        disabled={readOnly}
      >
        <SelectTrigger id={name} aria-invalid={!!error}>
          {renderValue ? (
            <SelectValue placeholder={placeholder}>
              {field.value != null && field.value !== ''
                ? renderValue(String(field.value))
                : null}
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {!required && field.value && (
            <SelectItem value={FORM_SELECT_CLEAR_SENTINEL}>
              Clear selection
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {renderOption ? renderOption(option) : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
