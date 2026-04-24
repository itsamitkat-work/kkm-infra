'use client';

import * as React from 'react';
import {
  Control,
  FieldPath,
  FieldValues,
  useController,
} from 'react-hook-form';
import { IconChevronDown } from '@tabler/icons-react';
import { CheckIcon } from 'lucide-react';

import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const FORM_SELECT_CLEAR_ITEM_VALUE = '__form_select_clear__';

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
  searchPlaceholder?: string;
  emptyMessage?: string;
}

function commandFilterOptions(
  options: SelectOption[],
  value: string,
  search: string
): number {
  if (value === FORM_SELECT_CLEAR_ITEM_VALUE) {
    return search.trim() === '' ? 1 : 0;
  }
  const option = options.find((opt) => opt.value === value);
  if (!option) {
    return 0;
  }
  if (option.label.toLowerCase().includes(search.toLowerCase())) {
    return 1;
  }
  return 0;
}

type FormSelectClearCommandItemProps = {
  onClear: () => void;
};

function FormSelectClearCommandItem({
  onClear,
}: FormSelectClearCommandItemProps) {
  function handleSelect() {
    onClear();
  }

  return (
    <CommandItem
      value={FORM_SELECT_CLEAR_ITEM_VALUE}
      onSelect={handleSelect}
      className='[&>svg:last-child]:hidden'
    >
      Clear selection
    </CommandItem>
  );
}

type FormSelectOptionCommandItemProps = {
  option: SelectOption;
  /** Form field value — check mark only when this equals `option.value`, not keyboard focus. */
  selectedFormValue: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  onPick: (value: string) => void;
};

function FormSelectOptionCommandItem({
  option,
  selectedFormValue,
  renderOption: renderOptionProp,
  onPick,
}: FormSelectOptionCommandItemProps) {
  function handleSelect() {
    onPick(option.value);
  }

  const isChosen = option.value === selectedFormValue;

  return (
    <CommandItem
      value={option.value}
      onSelect={handleSelect}
      className={cn(
        'relative pr-8',
        '[&>svg:last-child]:hidden'
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        {renderOptionProp ? (
          renderOptionProp(option)
        ) : (
          <span className='truncate'>{option.label}</span>
        )}
      </div>
      <CheckIcon
        className={cn(
          'pointer-events-none absolute right-2 size-4 shrink-0 text-primary',
          isChosen ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden={!isChosen}
      />
    </CommandItem>
  );
}

type FormSelectFieldCommandMenuProps = {
  filterItems: (value: string, search: string) => number;
  searchPlaceholder: string;
  emptyMessage: string;
  required: boolean;
  stringValue: string;
  options: SelectOption[];
  renderOption?: (option: SelectOption) => React.ReactNode;
  onClear: () => void;
  onPick: (value: string) => void;
};

function FormSelectFieldCommandMenu({
  filterItems,
  searchPlaceholder,
  emptyMessage,
  required,
  stringValue,
  options,
  renderOption,
  onClear,
  onPick,
}: FormSelectFieldCommandMenuProps) {
  const showClearRow = !required && stringValue !== '';

  return (
    <Command shouldFilter filter={filterItems} className='text-sm leading-snug'>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList className='max-h-[min(280px,50vh)]'>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {showClearRow ? (
            <FormSelectClearCommandItem onClear={onClear} />
          ) : null}
          {options.map((option) => (
            <FormSelectOptionCommandItem
              key={option.value}
              option={option}
              selectedFormValue={stringValue}
              renderOption={renderOption}
              onPick={onPick}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
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
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
}: FormSelectFieldProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  const stringValue =
    field.value === undefined || field.value === null
      ? ''
      : String(field.value);

  const selectedOption = React.useMemo(() => {
    return options.find((o) => o.value === stringValue);
  }, [options, stringValue]);

  const triggerDisplay = React.useMemo(() => {
    if (stringValue === '') {
      return null;
    }
    if (renderValue) {
      return renderValue(stringValue);
    }
    return selectedOption?.label ?? stringValue;
  }, [stringValue, renderValue, selectedOption]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function handleSelectOption(optionValue: string) {
    field.onChange(optionValue);
    setOpen(false);
  }

  function handleClearSelection() {
    field.onChange('');
    setOpen(false);
  }

  const filterItems = React.useCallback(
    (value: string, search: string) => {
      return commandFilterOptions(options, value, search);
    },
    [options]
  );

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && ' *'}
      </FieldLabel>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={name}
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-invalid={!!error}
            disabled={readOnly}
            className={cn(
              'h-8 w-full justify-between font-normal',
              !stringValue && 'text-muted-foreground'
            )}
          >
            <span className='min-w-0 flex-1 truncate text-left'>
              {triggerDisplay ?? placeholder}
            </span>
            <IconChevronDown className='h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[var(--radix-popover-trigger-width)] p-0'
          align='start'
        >
          <FormSelectFieldCommandMenu
            filterItems={filterItems}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            required={required}
            stringValue={stringValue}
            options={options}
            renderOption={renderOption}
            onClear={handleClearSelection}
            onPick={handleSelectOption}
          />
        </PopoverContent>
      </Popover>
      {error?.message ? <FieldError>{error.message}</FieldError> : null}
    </Field>
  );
}
