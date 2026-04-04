'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { ExtendedColumnDef, handleKeyDown, handlePaste } from './utils';
import DateInput from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { TextareaWithAutocomplete } from '@/components/ui/textarea-with-autocomplete';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

// Lightweight parsing for common date entry. Stores ISO (yyyy-MM-dd). Displays dd/MM/yyyy by default.

export interface CellEditorProps<T extends Record<string, unknown>> {
  colDef: ExtendedColumnDef<T>;
  rowData: T;
  value: string;
  disabled: boolean;
  dense?: boolean;
  enableEditing: boolean;
  onValueChange: (value: string) => void;
  autoFocus?: boolean;
}

export function CellEditor<T extends Record<string, unknown>>({
  colDef,
  rowData,
  value,
  disabled,
  dense = true,
  enableEditing,
  onValueChange,
  autoFocus = false,
}: CellEditorProps<T>) {
  const [inputValue, setInputValue] = useState<string>(value ?? '');

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  const debouncedOnValueChange = useDebouncedCallback(onValueChange, 300);

  const inputType = colDef.inputType || 'input';
  const inputConfig = colDef.inputConfig || {};

  const suggestions = useMemo(() => {
    const cfg = colDef.inputConfig;
    if (!cfg?.suggestions) return [] as string[];
    if (Array.isArray(cfg.suggestions)) return cfg.suggestions;
    if (typeof cfg.suggestions === 'function') return cfg.suggestions(rowData);
    return [] as string[];
  }, [colDef.inputConfig, rowData]);

  const comboboxOptions = useMemo<unknown[]>(() => {
    const cfg = colDef.inputConfig;
    if (cfg?.options) {
      if (Array.isArray(cfg.options)) return cfg.options;
      if (typeof cfg.options === 'function') return cfg.options(rowData);
    }
    return suggestions;
  }, [colDef.inputConfig, rowData, suggestions]);

  const commonProps = {
    value: inputValue,
    disabled,
    className: cn(
      'w-full border-none outline-none bg-transparent hover:bg-transparent focus:bg-transparent',
      {
        'bg-muted': disabled,
      },
      dense ? 'text-sm' : ''
    ),
    autoFocus,
  } as const;

  const handleChange = (nextValue: string) => {
    if (!enableEditing) return;
    setInputValue(nextValue);
    debouncedOnValueChange(nextValue);
  };

  const handleKeyDownEvent = (
    e: React.KeyboardEvent<
      HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
    >
  ) => {
    if (!enableEditing) return;
    if (
      (e.ctrlKey || e.metaKey) &&
      ['a', 'c', 'x', 'z', 'v'].includes(e.key.toLowerCase())
    ) {
      return;
    }
    const syntheticEvent = {
      ...e,
      currentTarget: e.currentTarget,
      target: e.target,
    } as unknown as React.KeyboardEvent<HTMLDivElement | HTMLTableCellElement>;
    handleKeyDown(syntheticEvent, colDef);
  };

  const handlePasteEvent = (
    e: React.ClipboardEvent<
      HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
    >
  ) => {
    if (!enableEditing) return;
    const syntheticEvent = {
      ...e,
      currentTarget: e.currentTarget,
      target: e.target,
    } as unknown as React.ClipboardEvent<HTMLDivElement | HTMLTableCellElement>;
    handlePaste(syntheticEvent, colDef);
  };

  switch (inputType) {
    case 'combobox':
      return (
        <Combobox
          {...commonProps}
          onChange={(optionId) => handleChange(optionId)}
          onKeyDown={handleKeyDownEvent}
          onPaste={handlePasteEvent}
          options={comboboxOptions}
          placeholder={inputConfig.placeholder || 'Select...'}
          onSearch={inputConfig.onSearch}
          searchPlaceholder={inputConfig.searchPlaceholder}
          onLoadMore={inputConfig.onLoadMore}
          hasMore={inputConfig.hasMore}
          loading={inputConfig.loading}
          filterOptions={inputConfig.filterOptions}
          filterValue={inputConfig.filterValue}
          filterPlaceholder={inputConfig.filterPlaceholder}
          onFilterChange={inputConfig.onFilterChange}
          getOptionId={
            inputConfig.getOptionId
              ? (option) => inputConfig.getOptionId?.(option, rowData) ?? ''
              : undefined
          }
          getOptionLabel={
            inputConfig.getOptionLabel
              ? (option) => inputConfig.getOptionLabel?.(option, rowData) ?? ''
              : undefined
          }
          renderOption={
            inputConfig.renderOption
              ? ({ option, isSelected, searchValue }) =>
                  inputConfig.renderOption?.(option, {
                    rowData,
                    isSelected,
                    searchValue,
                  })
              : undefined
          }
          renderSelectedValue={
            inputConfig.renderSelectedValue
              ? (option) => inputConfig.renderSelectedValue?.(option, rowData)
              : undefined
          }
        />
      );

    case 'autocomplete':
      return (
        <AutocompleteInput
          {...commonProps}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDownEvent}
          onPaste={handlePasteEvent}
          suggestions={suggestions}
          maxSuggestions={inputConfig.maxSuggestions}
        />
      );

    case 'textarea':
      // Use TextareaWithAutocomplete if suggestions are provided
      if (suggestions.length > 0) {
        return (
          <div className='absolute inset-0 flex items-center'>
            <TextareaWithAutocomplete
              value={inputValue}
              disabled={disabled}
              placeholder={inputConfig.placeholder}
              className={cn(
                commonProps.className,
                'px-2',
                dense ? 'py-0' : 'py-1',
                // No borders/background in table cells; auto sized with overflow when exceeding max rows
                'min-h-0 h-auto resize-none !border-0 shadow-none rounded-none'
              )}
              autoSize
              disableFocusRing
              minRows={
                typeof inputConfig.minRows === 'number' &&
                inputConfig.minRows > 0
                  ? inputConfig.minRows
                  : typeof inputConfig.rows === 'number' && inputConfig.rows > 0
                    ? inputConfig.rows
                    : undefined
              }
              maxRows={
                typeof inputConfig.maxRows === 'number' &&
                inputConfig.maxRows > 0
                  ? inputConfig.maxRows
                  : undefined
              }
              suggestions={suggestions}
              triggerChar={inputConfig.triggerChar || '#'}
              maxSuggestions={inputConfig.maxSuggestions}
              formatSelectedValue={inputConfig.formatSelectedValue}
              onKeyDown={
                handleKeyDownEvent as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>
              }
              onPaste={
                handlePasteEvent as unknown as React.ClipboardEventHandler<HTMLTextAreaElement>
              }
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
        );
      }

      return (
        <div className='absolute inset-0 flex items-center'>
          <Textarea
            value={inputValue}
            disabled={disabled}
            placeholder={inputConfig.placeholder}
            className={cn(
              commonProps.className,
              'px-2',
              dense ? 'py-0' : 'py-1',
              // No borders/background in table cells; auto sized with overflow when exceeding max rows
              'min-h-0 h-auto resize-none !border-0 shadow-none rounded-none'
            )}
            autoSize
            disableFocusRing
            minRows={
              typeof inputConfig.minRows === 'number' && inputConfig.minRows > 0
                ? inputConfig.minRows
                : typeof inputConfig.rows === 'number' && inputConfig.rows > 0
                  ? inputConfig.rows
                  : undefined
            }
            maxRows={
              typeof inputConfig.maxRows === 'number' && inputConfig.maxRows > 0
                ? inputConfig.maxRows
                : undefined
            }
            onKeyDown={
              handleKeyDownEvent as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>
            }
            onPaste={
              handlePasteEvent as unknown as React.ClipboardEventHandler<HTMLTextAreaElement>
            }
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className='flex h-full w-full items-center justify-center'>
          <Checkbox
            disabled={disabled}
            autoFocus={autoFocus}
            checked={inputValue === 'true'}
            onCheckedChange={(checked) => handleChange(String(!!checked))}
            onKeyDown={handleKeyDownEvent}
          />
        </div>
      );

    case 'input':
    default:
      return (
        <input
          {...(commonProps as {
            value: string;
            disabled: boolean;
            className: string;
            autoFocus?: boolean;
          })}
          className={cn(
            commonProps.className,
            'h-full !px-2 !py-1',
            dense ? '!py-0' : '',
            'text-right'
          )}
          onKeyDown={handleKeyDownEvent}
          onPaste={handlePasteEvent}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <DateInput
          value={inputValue}
          disabled={disabled}
          className={cn(
            commonProps.className,
            'px-2',
            dense ? 'py-0' : 'py-1',
            // Ensure absolutely no border/background or focus ring inside table cells
            'border-0 shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent placeholder:opacity-100 placeholder:text-muted-foreground'
          )}
          autoFocus={autoFocus}
          placeholder={inputConfig.placeholder}
          onValueChange={handleChange}
          onKeyDown={handleKeyDownEvent}
          onPaste={handlePasteEvent}
        />
      );
  }
}
