'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { Input, InputGroup } from '@/components/ui/input';
import { Field, FieldDescription, FieldLabel, FieldError } from '@/components/ui/field';

interface FormInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
  readOnly?: boolean;
  inputAddon?: React.ReactNode;
  /** Helper text below the input; rendered with `FieldDescription`. */
  description?: React.ReactNode;
  /** HTML `list` attribute (e.g. id of a `<datalist>` for preset suggestions). */
  list?: string;
}

export function FormInputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  required = false,
  type = 'text',
  className,
  readOnly = false,
  inputAddon,
  description,
  list,
}: FormInputFieldProps<TFieldValues, TName>) {
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
      <InputGroup>
        {inputAddon}
        <Input
          id={name}
          placeholder={placeholder}
          {...field}
          readOnly={readOnly}
          type={type}
          aria-invalid={!!error}
          list={list}
        />
      </InputGroup>
      {description != null && description !== '' && (
        <FieldDescription>{description}</FieldDescription>
      )}
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
