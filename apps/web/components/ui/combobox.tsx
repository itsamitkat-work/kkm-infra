"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FieldOption {
  id: string;
  label: string;
}

export interface ComboboxRenderOptionProps<TOption> {
  option: TOption;
  label: string;
  isSelected: boolean;
  searchValue: string;
}

export interface ComboboxProps<TOption = string> {
  value?: string | null;
  onChange: (optionId: string, option: TOption) => void;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  options: TOption[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  getOptionId?: (option: TOption) => string;
  getOptionLabel?: (option: TOption) => string;
  renderOption?: (props: ComboboxRenderOptionProps<TOption>) => React.ReactNode;
  renderSelectedValue?: (option: TOption | null) => React.ReactNode;
  searchPlaceholder?: string;
  filterOptions?: FieldOption[];
  filterValue?: string | null;
  filterPlaceholder?: string;
  onFilterChange?: (value: string | null) => void;
}

function HeaderFilter({
  options = [],
  value,
  placeholder = "Filter",
  onChange,
}: {
  options: FieldOption[];
  value?: string | null;
  placeholder?: string;
  onChange?: (value: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const normalizedOptions = React.useMemo(() => {
    if (!options.length) return [];
    return options;
  }, [options]);

  const hasOptions = normalizedOptions.length > 0;

  const selected = React.useMemo(() => {
    if (value == null) return undefined;
    const matched = normalizedOptions.find((option) => option.id === value);
    if (matched) return matched;
    if (!hasOptions && value) {
      return { id: value, label: value };
    }
    return matched;
  }, [hasOptions, normalizedOptions, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-w-[140px] justify-between border-input text-xs"
        >
          <span className="truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            <CommandGroup>
              {hasOptions ? (
                normalizedOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onChange?.(option.id);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {selected?.id === option.id ? (
                      <Check className="ml-2 h-3.5 w-3.5" />
                    ) : null}
                  </CommandItem>
                ))
              ) : (
                <CommandItem
                  key="__no-options"
                  value="__no-options"
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  <span className="flex-1 truncate">No options</span>
                </CommandItem>
              )}
              {selected ? (
                <CommandItem
                  key="__clear"
                  value="__clear"
                  onSelect={() => {
                    onChange?.(null);
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <span className="flex-1 truncate">Clear filter</span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function Combobox<TOption = string>({
  value,
  onChange,
  onFocus,
  onKeyDown,
  onPaste,
  disabled = false,
  className,
  placeholder = "Select option...",
  options = [],
  onLoadMore,
  hasMore = false,
  loading = false,
  autoFocus = false,
  onSearch,
  getOptionId,
  getOptionLabel,
  renderOption,
  renderSelectedValue,
  searchPlaceholder,
  filterOptions,
  filterValue,
  filterPlaceholder,
  onFilterChange,
}: ComboboxProps<TOption>) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const loaderRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [scrollContainer, setScrollContainer] =
    React.useState<HTMLDivElement | null>(null);
  const [selectedOptionCache, setSelectedOptionCache] =
    React.useState<TOption | null>(null);

  const resolveOptionId = React.useCallback(
    (option: unknown): string => {
      if (typeof getOptionId === "function") {
        return getOptionId(option as TOption);
      }

      if (typeof option === "string") return option;
      if (typeof option === "number") return String(option);
      if (option && typeof option === "object") {
        const candidate = option as Record<string, unknown>;
        if (typeof candidate.id === "string") return candidate.id;
        if (typeof candidate.value === "string") return candidate.value;
        if (typeof candidate.code === "string") return candidate.code;
      }
      return JSON.stringify(option);
    },
    [getOptionId]
  );

  const resolveOptionLabel = React.useCallback(
    (option: unknown): string => {
      if (typeof getOptionLabel === "function") {
        return getOptionLabel(option as TOption);
      }

      if (typeof option === "string" || typeof option === "number") {
        return String(option);
      }

      if (option && typeof option === "object") {
        const candidate = option as Record<string, unknown>;
        if (typeof candidate.label === "string") return candidate.label;
        if (typeof candidate.title === "string") return candidate.title;
        if (typeof candidate.name === "string") return candidate.name;
        if (typeof candidate.code === "string") return candidate.code;
      }

      return "";
    },
    [getOptionLabel]
  );

  const matchedOption = React.useMemo(() => {
    if (!value) return null;
    return options.find((option) => resolveOptionId(option) === value) ?? null;
  }, [options, resolveOptionId, value]);

  React.useEffect(() => {
    if (!value) {
      setSelectedOptionCache(null);
      return;
    }

    if (matchedOption) {
      setSelectedOptionCache(matchedOption);
    }
  }, [matchedOption, value]);

  const effectiveSelectedOption = React.useMemo(() => {
    return matchedOption ?? selectedOptionCache;
  }, [matchedOption, selectedOptionCache]);

  const availableOptions = React.useMemo(() => {
    let filtered = options;
    if (effectiveSelectedOption) {
      const selectedId = resolveOptionId(effectiveSelectedOption);
      filtered = options.filter((option) => resolveOptionId(option) !== selectedId);
    }

    if (!onSearch && searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      filtered = filtered.filter((option) =>
        resolveOptionLabel(option).toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [
    options,
    resolveOptionId,
    effectiveSelectedOption,
    onSearch,
    searchValue,
    resolveOptionLabel,
  ]);

  const showNoOptions = !loading && availableOptions.length === 0 && !hasMore;

  // Helper function to focus search input
  const focusSearchInput = React.useCallback(() => {
    const timer = setTimeout(() => {
      // Find the input element inside CommandInput
      const inputElement = searchInputRef.current?.querySelector(
        "input"
      ) as HTMLInputElement | null;
      if (inputElement) {
        inputElement.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Autofocus search input when popover opens
  React.useEffect(() => {
    if (open) {
      return focusSearchInput();
    }
  }, [open, focusSearchInput]);

  // Handle autoFocus - focus the button and optionally open the popover
  React.useEffect(() => {
    if (autoFocus && !disabled && buttonRef.current) {
      // Small delay to ensure the button is rendered
      const timer = setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.focus();
          // Optionally open the popover for comboboxes when auto-focused
          if (!open) {
            setOpen(true);
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled, open]);

  // Use IntersectionObserver to load more items
  React.useEffect(() => {
    if (!open || !scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !loading && onLoadMore) {
          onLoadMore();
        }
      },
      { root: scrollContainer, threshold: 0.1 }
    );

    const loaderEl = loaderRef.current;
    if (loaderEl) {
      observer.observe(loaderEl);
    }

    return () => {
      if (loaderEl) {
        observer.unobserve(loaderEl);
      }
    };
  }, [open, scrollContainer, hasMore, loading, onLoadMore]);

  // Handle selection
  const handleSelect = (selectedOptionId: string, option: TOption) => {
    onChange(selectedOptionId, option);
    setSelectedOptionCache(option);
    setOpen(false);
    setSearchValue("");
    if (onSearch) {
      onSearch("");
    }
  };

  // Handle input change for search
  const handleInputChange = (inputValue: string) => {
    setSearchValue(inputValue);
    // Only call onSearch if we expect more data from the server.
    if (onSearch) {
      onSearch(inputValue);
    }
  };

  const renderOptionContent = React.useCallback(
    (option: TOption, isSelected: boolean) => {
      if (renderOption) {
        return renderOption({
          option,
          label: resolveOptionLabel(option),
          isSelected,
          searchValue,
        });
      }

      const label = resolveOptionLabel(option);
      return <span className="flex-1 break-words truncate">{label}</span>;
    },
    [renderOption, resolveOptionLabel, searchValue]
  );

  const renderTriggerValue = React.useMemo(() => {
    const optionForLabel = effectiveSelectedOption ?? matchedOption;
    if (renderSelectedValue) {
      return renderSelectedValue(optionForLabel ?? null);
    }

    const label = optionForLabel
      ? resolveOptionLabel(optionForLabel)
      : value ?? placeholder;
    return <span className="flex-1 truncate text-left">{label}</span>;
  }, [
    effectiveSelectedOption,
    placeholder,
    renderSelectedValue,
    resolveOptionLabel,
    matchedOption,
    value,
  ]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    // Handle Enter key to open/close
    if (e.key === "Enter" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal border-none shadow-none bg-transparent hover:bg-transparent focus:bg-transparent",
            !effectiveSelectedOption && "text-muted-foreground",
            className
          )}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          autoFocus={autoFocus}
        >
          {renderTriggerValue}
          {/* <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-sm p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 px-2 py-2">
            {filterOptions && filterOptions.length > 0 && (
              <HeaderFilter
                options={filterOptions}
                value={filterValue ?? null}
                placeholder={filterPlaceholder}
                onChange={(nextValue) => {
                  onFilterChange?.(nextValue);
                  focusSearchInput();
                }}
              />
            )}

            <div ref={searchInputRef} className="flex-1">
              <CommandInput
                placeholder={searchPlaceholder ?? "Search..."}
                value={searchValue}
                onValueChange={handleInputChange}
                className="h-9 flex-1"
              />
            </div>
          </div>
          <CommandList
            ref={setScrollContainer}
            className="max-h-[300px] min-h-[300px]"
          >
            {effectiveSelectedOption && (
              <CommandGroup heading="Selected">
                <CommandItem
                  key={resolveOptionId(effectiveSelectedOption)}
                  value={resolveOptionId(effectiveSelectedOption)}
                  onSelect={() =>
                    handleSelect(
                      resolveOptionId(effectiveSelectedOption),
                      effectiveSelectedOption
                    )
                  }
                  className="truncate"
                >
                  {renderOptionContent(effectiveSelectedOption, true)}
                  <Check
                    className={cn("ml-2 h-4 w-4 flex-shrink-0", "opacity-100")}
                  />
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Options">
              {availableOptions.map((suggestion) => (
                <CommandItem
                  key={resolveOptionId(suggestion)}
                  value={resolveOptionId(suggestion)}
                  onSelect={() =>
                    handleSelect(resolveOptionId(suggestion), suggestion)
                  }
                  className="truncate"
                >
                  {renderOptionContent(suggestion, false)}
                  <Check
                    className={cn("ml-2 h-4 w-4 flex-shrink-0", "opacity-0")}
                  />
                </CommandItem>
              ))}
              {hasMore && (
                <CommandItem
                  ref={loaderRef}
                  key="loader"
                  disabled
                  className="flex items-center justify-center text-center text-muted-foreground"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </CommandItem>
              )}
            </CommandGroup>
            {loading && !hasMore && (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {showNoOptions && (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                No option found.
              </div>
            )}
            {!effectiveSelectedOption &&
              !availableOptions.length &&
              !showNoOptions &&
              !hasMore &&
              !loading && (
                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                  {placeholder}
                </div>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
