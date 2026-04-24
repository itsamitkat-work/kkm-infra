'use client';

import { IconSearch, IconX } from '@tabler/icons-react';
import * as React from 'react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  kbd?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, kbd, disabled, ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    const handleClearButtonClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onClear?.();
      },
      [onClear]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Escape') {
          return;
        }

        e.preventDefault();
        if (hasValue) {
          onClear?.();
        } else {
          e.currentTarget.blur();
        }
      },
      [hasValue, onClear]
    );

    return (
      <InputGroup
        className={cn(className)}
        data-disabled={disabled ? true : undefined}
      >
        <InputGroupAddon align='inline-start' className='py-1.5 pl-2.5'>
          <IconSearch
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          value={value}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className='min-w-0 !h-8'
          {...props}
        />
        {(hasValue || kbd) && (
          <InputGroupAddon align='inline-end' className='py-1.5 pr-2.5'>
            {hasValue ? (
              <InputGroupButton
                type='button'
                size='icon-xs'
                aria-label='Clear search'
                disabled={disabled}
                onClick={handleClearButtonClick}
              >
                <IconX className='size-4' />
              </InputGroupButton>
            ) : (
              <Kbd>{kbd}</Kbd>
            )}
          </InputGroupAddon>
        )}
      </InputGroup>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
