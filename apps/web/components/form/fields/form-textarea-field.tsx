'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

interface FormTextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
  rows?: number;
}

export function FormTextareaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  required = false,
  className,
  readOnly = false,
  rows = 4,
}: FormTextareaFieldProps<TFieldValues, TName>) {
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
      <Textarea
        id={name}
        placeholder={placeholder}
        disabled={readOnly}
        rows={rows}
        aria-invalid={!!error}
        {...field}
      />
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
