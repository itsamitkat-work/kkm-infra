'use client';

import * as React from 'react';
import { IconChevronDown } from '@tabler/icons-react';

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

export type SheetCellComboboxProps = {
  value: string;
  onChange: (next: string) => void;
  options: unknown[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  filterOptions?: { id: string; label: string }[];
  filterValue?: string | null;
  filterPlaceholder?: string;
  onFilterChange?: (id: string | null) => void;
  getOptionId?: (option: unknown) => string;
  getOptionLabel?: (option: unknown) => string;
  renderOption?: (
    option: unknown,
    ctx: { isSelected: boolean; searchValue: string }
  ) => React.ReactNode;
  renderSelectedValue?: (option: unknown | null) => React.ReactNode;
  autoFocus?: boolean;
  onKeyDown?: (
    e: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>
  ) => void;
  onPaste?: (
    e: React.ClipboardEvent<HTMLButtonElement | HTMLInputElement>
  ) => void;
};

function defaultGetOptionId(option: unknown): string {
  if (
    option !== null &&
    typeof option === 'object' &&
    'id' in (option as object)
  ) {
    return String((option as { id: unknown }).id);
  }
  return String(option ?? '');
}

function defaultGetOptionLabel(option: unknown): string {
  if (
    option !== null &&
    typeof option === 'object' &&
    'label' in (option as object)
  ) {
    return String((option as { label: unknown }).label);
  }
  return String(option ?? '');
}

export function SheetCellCombobox({
  value,
  onChange,
  options,
  disabled = false,
  className,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  onSearch,
  onLoadMore,
  hasMore,
  loading = false,
  filterOptions,
  filterValue,
  onFilterChange,
  getOptionId = defaultGetOptionId,
  getOptionLabel = defaultGetOptionLabel,
  renderOption,
  renderSelectedValue,
  autoFocus = false,
  onKeyDown,
  onPaste,
}: SheetCellComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
      return;
    }
    if (!onSearch) {
      return;
    }
    const timer = window.setTimeout(() => {
      onSearch(searchTerm);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open, searchTerm, onSearch]);

  const selectedOption = React.useMemo(() => {
    return options.find((o) => getOptionId(o) === value) ?? null;
  }, [options, value, getOptionId]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function handleSelectOption(option: unknown) {
    onChange(getOptionId(option));
    setOpen(false);
  }

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!onLoadMore || !hasMore) {
      return;
    }
    const el = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 24) {
      onLoadMore();
    }
  }

  const triggerLabel = renderSelectedValue
    ? renderSelectedValue(selectedOption)
    : selectedOption
      ? getOptionLabel(selectedOption)
      : value || placeholder;

  const searchInputProps = onSearch
    ? {
        value: searchTerm,
        onValueChange: setSearchTerm,
        isLoading: loading,
      }
    : {};

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(
            'h-auto min-h-8 w-full justify-between rounded-none px-2 font-normal shadow-none hover:bg-transparent',
            className
          )}
        >
          <span className='min-w-0 flex-1 truncate text-left'>
            {triggerLabel}
          </span>
          <IconChevronDown className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='max-h-[min(320px,70vh)] w-[min(100vw-24px,var(--radix-popover-trigger-width))] min-w-[var(--radix-popover-trigger-width)] p-0'
        align='start'
        onOpenAutoFocus={(e) => {
          if (!autoFocus) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={!onSearch}>
          {filterOptions && filterOptions.length > 0 ? (
            <div className='flex flex-wrap gap-1 border-b p-2'>
              {filterOptions.map((opt) => {
                const isActive = filterValue === opt.id;
                return (
                  <Button
                    key={opt.id}
                    type='button'
                    size='sm'
                    variant={isActive ? 'secondary' : 'outline'}
                    className='h-7'
                    onClick={() => {
                      onFilterChange?.(isActive ? null : opt.id);
                    }}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          ) : null}
          <CommandInput placeholder={searchPlaceholder} {...searchInputProps} />
          <CommandList className='max-h-[220px]' onScroll={handleListScroll}>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const id = getOptionId(option);
                const cmdValue = `${getOptionLabel(option)} ${id}`;
                const isSelected = id === value;
                return (
                  <CommandItem
                    key={id}
                    value={cmdValue}
                    onSelect={() => {
                      handleSelectOption(option);
                    }}
                  >
                    {renderOption ? (
                      renderOption(option, {
                        isSelected,
                        searchValue: searchTerm,
                      })
                    ) : (
                      <span className='truncate'>{getOptionLabel(option)}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
