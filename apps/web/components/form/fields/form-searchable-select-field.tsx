'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { IconChevronDown, IconX } from '@tabler/icons-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  // Either provide static options OR a fetchOptions method
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
  // Custom value extraction for complex objects
  getValue?: (option: SearchableOption) => unknown;
  getDisplayValue?: (fieldValue: unknown) => string;
  getOptionValue?: (fieldValue: unknown) => string;
}

/**
 * Generic searchable combobox field that can be used for any type of searchable data.
 * Supports both static options and dynamic fetching with built-in debounced search and infinite scroll.
 * Automatically shows a "Clear selection" option for optional fields when a value is selected.
 *
 * @example
 * // For static options:
 * <FormSearchableComboboxField
 *   control={control}
 *   name="status"
 *   label="Status"
 *   options={statusOptions}
 * />
 *
 * @example
 * // For dynamic fetching (e.g. schedule sources):
 * <FormSearchableComboboxField
 *   control={control}
 *   name="client"
 *   label="Client"
 *   fetchOptions={fetchScheduleSourceOptions}
 *   getValue={(option) => ({ id: option.value, name: option.label })}
 *   getDisplayValue={(fieldValue) => fieldValue?.name || ""}
 *   getOptionValue={(fieldValue) => fieldValue?.id || ""}
 * />
 * @example
 * // Creating a fetchOptions function:
 * const fetchScheduleSourceOptions = async (search: string, page: number) => ({
 *   options: [],
 *   hasNextPage: false,
 * });
 */
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
  onSelect,
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

  const isDynamic = !!fetchOptions;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['searchable-combobox', name, debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) =>
      fetchOptions!(debouncedSearchTerm, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasNextPage ? allPages.length + 1 : undefined;
    },
    enabled: isDynamic,
    initialPageParam: 1,
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
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
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollContainerRef, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allOptions = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.options) ?? [];
  }, [data]);

  const currentOptions = isDynamic ? allOptions : options || [];
  const currentIsLoading = isDynamic
    ? isFetching && !isFetchingNextPage
    : currentOptions.length === 0;
  const currentError = error;
  const isSearching =
    isDynamic && isFetching && !isFetchingNextPage && allOptions.length > 0;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const handleSelect = (value: string) => {
          const selectedOption = currentOptions.find(
            (opt) => opt.value === value
          );
          if (selectedOption) {
            const fieldValue = getValue(selectedOption);
            field.onChange(fieldValue);
            setOpen(false);

            // Call the callback if provided
            if (onSelect) {
              onSelect(selectedOption);
            }
          }
        };

        const handleClear = (e: React.MouseEvent) => {
          e.stopPropagation();
          field.onChange('');
        };

        const displayValue = getDisplayValue(field.value);
        const hasValue = getOptionValue(field.value);
        const selectedValue = getOptionValue(field.value);

        const selectedOption = currentOptions.find(
          (opt) => opt.value === selectedValue
        );

        return (
          <FormItem className={className}>
            <FormLabel>
              {label}
              {required && ' *'}
            </FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={open}
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
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0' align='start'>
                <Command
                  shouldFilter={!isDynamic}
                  filter={(value, search) => {
                    const option = currentOptions.find(
                      (opt) => opt.value === value
                    );
                    if (option) {
                      return option.label
                        .toLowerCase()
                        .includes(search.toLowerCase())
                        ? 1
                        : 0;
                    }
                    return 0;
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
                                <span className='mr-2'>
                                  {selectedOption.icon}
                                </span>
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
                          {/* Clear option for optional fields */}
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
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
