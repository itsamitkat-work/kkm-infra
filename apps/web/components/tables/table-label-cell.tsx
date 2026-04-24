'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TableLabelCellProps = {
  /** Primary label (e.g. name, title) */
  label: string;
  /** Optional secondary line (e.g. nickname, subtitle) */
  subLabel?: string;
  /** Optional click handler. When provided, cell is rendered as a button (clickable variant). */
  onClick?: () => void;
  /** When `onClick` is set, forwards to the button (e.g. permission-gated rows). */
  disabled?: boolean;
  /** Stronger weight on the primary label (e.g. client display name). */
  emphasis?: boolean;
  /** When true, label uses muted text color (e.g. for Head / SubHead columns) */
  muted?: boolean;
  /** Optional extra class name for the outer wrapper */
  className?: string;
  /** Extra classes for the clickable button (e.g. `text-foreground hover:text-primary`). */
  buttonClassName?: string;
  /** Tooltip open delay in ms (default 300). */
  tooltipDelayDuration?: number;
};

function TableLabelCellContent({
  label,
  subLabel,
  muted,
  emphasis,
}: Pick<TableLabelCellProps, 'label' | 'subLabel' | 'muted' | 'emphasis'>) {
  return (
    <div className={'flex min-w-0 flex-col overflow-hidden text-left'}>
      <span
        className={
          muted
            ? 'min-w-0 truncate text-sm text-muted-foreground'
            : cn(
                'min-w-0 truncate text-sm',
                emphasis && 'font-medium text-foreground'
              )
        }
      >
        {label}
      </span>
      {subLabel ? (
        <span className={'min-w-0 truncate text-xs text-muted-foreground'}>
          {subLabel}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Reusable table cell for a primary label with optional sublabel.
 * - With `onClick`: clickable variant (button), truncates with ellipsis, no overflow.
 *   Supports `disabled`, `buttonClassName`, and `tooltipDelayDuration`.
 * - Without `onClick`: static variant (non-clickable), e.g. for Head / SubHead columns.
 */
export function TableLabelCell({
  label,
  subLabel,
  onClick,
  disabled = false,
  emphasis = false,
  muted = false,
  className,
  buttonClassName,
  tooltipDelayDuration = 300,
}: TableLabelCellProps) {
  const content = (
    <TableLabelCellContent
      label={label}
      subLabel={subLabel}
      muted={muted}
      emphasis={emphasis}
    />
  );

  const tooltipContent = (
    <>
      <p className='text-sm'>{label}</p>
      {subLabel ? (
        <p className='text-xs text-muted-foreground'>{subLabel}</p>
      ) : null}
    </>
  );

  const wrapperClass =
    `min-w-0 max-w-full overflow-hidden ${className ?? ''}`.trim();

  if (onClick) {
    return (
      <div className={wrapperClass}>
        <Tooltip delayDuration={tooltipDelayDuration}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              mode='link'
              onClick={onClick}
              disabled={disabled}
              className={cn(
                'h-auto min-h-0 w-full min-w-0 max-w-full py-1 font-normal text-left overflow-hidden justify-start',
                buttonClassName
              )}
            >
              {content}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <Tooltip delayDuration={tooltipDelayDuration}>
        <TooltipTrigger asChild>
          <div className='min-w-0 max-w-full overflow-hidden py-1 cursor-default'>
            {content}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </div>
  );
}
