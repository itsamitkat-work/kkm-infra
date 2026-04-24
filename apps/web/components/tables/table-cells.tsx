'use client';

import { IconDotsVertical } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TextCellProps = {
  label?: string;
  subLabel?: string;
  /**
   * `description` = primary text may wrap to two lines (same typography as `default`).
   * `default` = single-line clamp.
   */
  variant?: 'default' | 'description';
  muted?: boolean;
  emphasis?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  tooltipDelayDuration?: number;
};

function TextCellTooltipBody({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className='max-w-xs space-y-1'>
      <p className='m-0 text-sm leading-snug'>{title}</p>
      {subtitle ? (
        <p className='m-0 text-xs leading-snug text-muted-foreground'>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Table cell built on `Item` with a tooltip on the whole cell.
 * Formatting (currency, dates, etc.) belongs at the call site via `label` / `subLabel`.
 *
 * Typography: compact UI (`text-sm`, `leading-snug`) for dense rows — not prose
 * paragraph styles (`leading-7`, stacked `p` margins).
 */
export function TextCell({
  label = '',
  subLabel,
  variant = 'default',
  muted = true,
  emphasis = false,
  onClick,
  disabled = false,
  className,
  buttonClassName,
  tooltipDelayDuration = 300,
}: TextCellProps) {
  const primaryDisplay = label || '—';

  const itemClass = cn(
    'min-w-0 max-w-full overflow-hidden border-0 bg-transparent shadow-none',
    'px-1 py-0.5',
    className
  );

  const isMultiline = variant === 'description';

  const body = (
    <>
      <ItemTitle
        className={cn(
          'block w-full min-w-0 max-w-full overflow-hidden text-sm font-normal leading-snug',
          isMultiline
            ? 'line-clamp-2 whitespace-normal break-words'
            : 'truncate',
          muted ? 'text-muted-foreground' : 'text-foreground',
          !muted && emphasis && 'font-medium',
          isMultiline &&
            onClick != null &&
            'cursor-pointer hover:text-primary hover:underline'
        )}
      >
        {primaryDisplay}
      </ItemTitle>
      {subLabel ? (
        <ItemDescription className='line-clamp-1 min-w-0 max-w-full overflow-hidden leading-snug'>
          {subLabel}
        </ItemDescription>
      ) : null}
    </>
  );

  const itemInner = (
    <Item size='xs' variant='default' className={itemClass}>
      <ItemContent className='min-w-0 w-full max-w-full gap-0 overflow-hidden'>
        {body}
      </ItemContent>
    </Item>
  );

  return (
    <Tooltip delayDuration={tooltipDelayDuration}>
      <TooltipTrigger asChild>
        <div className='min-w-0 max-w-full overflow-hidden text-sm leading-snug'>
          {onClick != null ? (
            <Button
              type='button'
              variant='link'
              onClick={onClick}
              disabled={disabled}
              className={cn(
                'h-auto min-h-0 w-full min-w-0 max-w-full justify-start overflow-hidden border-0 bg-transparent p-0 font-normal shadow-none',
                isMultiline && 'items-start whitespace-normal',
                buttonClassName
              )}
            >
              {itemInner}
            </Button>
          ) : (
            itemInner
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <TextCellTooltipBody title={primaryDisplay} subtitle={subLabel} />
      </TooltipContent>
    </Tooltip>
  );
}

export type TableRowActionsMenuItem =
  | { type: 'separator'; key: string }
  | {
      type: 'item';
      key: string;
      label: string;
      onSelect: () => void;
      destructive?: boolean;
    };

export type TableRowActionsMenuCellProps = {
  items: TableRowActionsMenuItem[];
};

export function TableRowActionsMenuCell({
  items,
}: TableRowActionsMenuCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='data-[state=open]:bg-muted text-muted-foreground flex size-8'
          size='icon'
        >
          <IconDotsVertical />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        {items.map((item) => {
          if (item.type === 'separator') {
            return <DropdownMenuSeparator key={item.key} />;
          }
          return (
            <DropdownMenuItem
              key={item.key}
              variant={item.destructive ? 'destructive' : 'default'}
              onClick={item.onSelect}
            >
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
