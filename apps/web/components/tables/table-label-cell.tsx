'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TableLabelCellProps = {
  /** Primary label (e.g. name, title) */
  label: string;
  /** Optional secondary line (e.g. nickname, subtitle) */
  subLabel?: string;
  /** Optional click handler. When provided, cell is rendered as a button (clickable variant). */
  onClick?: () => void;
  /** When true, label uses muted text color (e.g. for Head / SubHead columns) */
  muted?: boolean;
  /** Optional extra class name for the outer wrapper */
  className?: string;
};

function TableLabelCellContent({
  label,
  subLabel,
  muted,
}: Pick<TableLabelCellProps, 'label' | 'subLabel' | 'muted'>) {
  return (
    <div className={'flex min-w-0 flex-col overflow-hidden text-left'}>
      <span
        className={
          muted
            ? 'min-w-0 truncate text-sm text-muted-foreground'
            : 'min-w-0 truncate text-sm'
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
 * - Without `onClick`: static variant (non-clickable), e.g. for Head / SubHead columns.
 */
export function TableLabelCell({
  label,
  subLabel,
  onClick,
  muted = false,
  className,
}: TableLabelCellProps) {
  const content = (
    <TableLabelCellContent label={label} subLabel={subLabel} muted={muted} />
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
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              mode='link'
              onClick={onClick}
              className='h-auto min-h-0 w-full min-w-0 max-w-full py-1 font-normal text-left overflow-hidden justify-start'
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
      <Tooltip delayDuration={300}>
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
