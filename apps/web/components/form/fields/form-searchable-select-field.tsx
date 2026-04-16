'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { IconChevronDown, IconX } from '@tabler/icons-react';
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
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useInfiniteQuery } from '@tanstack/react-query';

interface SearchableOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  id?: string | number;
}

interface FormSearchableComboboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  options?: SearchableOption[];
  fetchOptions?: (
    search: string,
    page: number
  ) => Promise<{
    options: SearchableOption[];
    hasNextPage: boolean;
  }>;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  debounceDelay?: number;
  onSelect?: (option: SearchableOption) => void;
  getValue?: (option: SearchableOption) => unknown;
  getDisplayValue?: (fieldValue: unknown) => string;
  getOptionValue?: (fieldValue: unknown) => string;
}

export function FormSearchableComboboxField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = 'Select an option',
  options,
  fetchOptions,
  required = false,
  className,
  readOnly = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  debounceDelay = 300,
  onSelect: onSelectCallback,
  getValue = (option) => option.value,
  getDisplayValue = (fieldValue) =>
    (fieldValue as { label?: string; name?: string })?.label ||
    (fieldValue as { label?: string; name?: string })?.name ||
    '',
  getOptionValue = (fieldValue) =>
    (fieldValue as { id?: string; value?: string })?.id ||
    (fieldValue as { id?: string; value?: string })?.value ||
    '',
}: FormSearchableComboboxFieldProps<TFieldValues, TName>) {
  const [open, setOpen] = React.useState(false);
  const { debouncedSearchTerm, setSearchTerm } =
    useDebouncedSearch(debounceDelay);

  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  const isDynamic = !!fetchOptions;

  const {
    data,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['searchable-combobox', name, debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) =>
      fetchOptions!(debouncedSearchTerm, pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    enabled: isDynamic,
    initialPageParam: 1,
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (
        scrollTop + clientHeight >= scrollHeight - 20 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const allOptions = React.useMemo(
    () => data?.pages.flatMap((page) => page.options) ?? [],
    [data]
  );

  const currentOptions = isDynamic ? allOptions : options || [];
  const currentIsLoading = isDynamic
    ? isFetching && !isFetchingNextPage
    : currentOptions.length === 0;
  const currentError = fetchError;
  const isSearching =
    isDynamic && isFetching && !isFetchingNextPage && allOptions.length > 0;

  function handleSelect(value: string) {
    const selectedOption = currentOptions.find((opt) => opt.value === value);
    if (selectedOption) {
      field.onChange(getValue(selectedOption));
      setOpen(false);
      onSelectCallback?.(selectedOption);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    field.onChange('');
  }

  const displayValue = getDisplayValue(field.value);
  const hasValue = getOptionValue(field.value);
  const selectedValue = getOptionValue(field.value);
  const selectedOption = currentOptions.find(
    (opt) => opt.value === selectedValue
  );

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && ' *'}
      </FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={name}
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-invalid={!!error}
            className={cn(
              'w-full justify-between',
              !hasValue && 'text-muted-foreground'
            )}
            disabled={readOnly}
          >
            {displayValue || placeholder}
            <div className='flex items-center gap-1'>
              {hasValue && !readOnly && !currentIsLoading && (
                <IconX
                  className='h-4 w-4 shrink-0 opacity-50 hover:opacity-100'
                  onClick={handleClear}
                />
              )}
              <IconChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 opacity-50',
                  currentIsLoading && 'animate-spin'
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-full p-0' align='start'>
          <Command
            shouldFilter={!isDynamic}
            filter={(value, search) => {
              const option = currentOptions.find((opt) => opt.value === value);
              return option?.label.toLowerCase().includes(search.toLowerCase())
                ? 1
                : 0;
            }}
          >
            <CommandInput
              placeholder={searchPlaceholder}
              disabled={isDynamic && isFetching && !data}
              onValueChange={setSearchTerm}
              isLoading={isSearching}
            />
            <CommandList
              className='max-h-[300px] min-h-[200px]'
              ref={scrollContainerRef}
            >
              {currentIsLoading && allOptions.length === 0 ? (
                <div className='py-6 text-center text-sm text-muted-foreground'>
                  Loading...
                </div>
              ) : currentError ? (
                <div className='py-6 text-center text-sm text-destructive'>
                  Error loading data: {currentError.message}
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  {selectedOption && (
                    <CommandGroup heading='Selected'>
                      <CommandItem
                        key={selectedOption.value}
                        value={selectedOption.value}
                        onSelect={handleSelect}
                      >
                        {selectedOption.icon && (
                          <span className='mr-2'>{selectedOption.icon}</span>
                        )}
                        <span className='truncate'>
                          {selectedOption.label}
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  <CommandGroup
                    heading={selectedOption ? 'Options' : undefined}
                  >
                    {!required && hasValue && (
                      <CommandItem
                        value='__clear__'
                        onSelect={() => {
                          field.onChange('');
                          setOpen(false);
                        }}
                      >
                        <IconX className='mr-2 h-4 w-4' />
                        Clear selection
                      </CommandItem>
                    )}
                    {currentOptions
                      .filter((option) => option.value !== selectedValue)
                      .map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={handleSelect}
                        >
                          {option.icon && (
                            <span className='mr-2'>{option.icon}</span>
                          )}
                          <span className='truncate'>{option.label}</span>
                        </CommandItem>
                      ))}
                    {isFetchingNextPage && (
                      <div className='py-2 text-center text-sm text-muted-foreground'>
                        Loading more...
                      </div>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
