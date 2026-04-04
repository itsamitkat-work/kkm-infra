'use client';

import * as React from 'react';
import { IconChevronDown, IconX } from '@tabler/icons-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export interface InfiniteSelectOption {
  value: string;
  label: string;
}

export interface InfiniteSelectFilterProps {
  queryKey: string;
  fetchOptions: (
    search: string,
    page: number
  ) => Promise<{
    options: InfiniteSelectOption[];
    hasNextPage: boolean;
  }>;
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  popoverContentClassName?: string;
}

export function InfiniteSelectFilter({
  queryKey,
  fetchOptions,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  className,
  popoverContentClassName,
}: InfiniteSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const { debouncedSearchTerm, setSearchTerm, searchTerm } =
    useDebouncedSearch(300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['infinite-select-filter', queryKey, debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) => fetchOptions(debouncedSearchTerm, pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    enabled: open,
    initialPageParam: 1,
    staleTime: 60_000,
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (
      scrollTop + clientHeight >= scrollHeight - 20 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage, isFetchingNextPage]);

  const allOptions = React.useMemo(
    () => data?.pages.flatMap((page) => page.options) ?? [],
    [data]
  );

  const selectedOption = allOptions.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? '';

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setSearchTerm('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  const triggerClassName = cn(
    'text-foreground transition shrink-0 flex items-center gap-1 relative focus-visible:z-1',
    'bg-background border border-border hover:bg-secondary',
    'h-8 px-3 gap-0 text-sm cursor-pointer [&_svg:not([class*=size-])]:size-4',
    'min-w-0 overflow-hidden',
    !value && 'text-muted-foreground',
    className
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role='combobox'
        aria-expanded={open}
        className={triggerClassName}
      >
        <div className='flex gap-1.5 items-center min-w-0 flex-1'>
          <span className={cn('min-w-0 flex-1 truncate text-left text-xs', !value && 'text-muted-foreground')}>
            {displayValue || placeholder}
          </span>
          {value && (
            <IconX
              className='h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer'
              onClick={handleClear}
            />
          )}
          {/* <IconChevronDown className='h-4 w-4 shrink-0 opacity-50' /> */}
        </div>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[calc(100vw-32px)] max-w-md lg:min-w-[400px] lg:w-auto p-0', popoverContentClassName)} align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList
            ref={scrollContainerRef}
            className='max-h-[200px] overflow-y-auto'
          >
            {isLoading && (
              <div className='flex items-center justify-center py-6'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              </div>
            )}
            {!isLoading && allOptions.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            <CommandGroup>
              {allOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className='cursor-pointer'
                >
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span className='min-w-0 truncate'>{option.label}</span>
                    </TooltipTrigger>
                    <TooltipContent side='right' className='max-w-sm'>
                      <p className='break-words'>{option.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </CommandItem>
              ))}
            </CommandGroup>
            {isFetchingNextPage && (
              <div className='flex items-center justify-center py-2'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
