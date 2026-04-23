'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  flattenItemDescription,
  getItemDescriptionSegments,
  type ItemDescriptionDoc,
} from './item-description-doc';

/** Matches `TooltipContent` in `@/components/ui/tooltip` for readable long copy in tables. */
export const HIERARCHY_BODY_CLASS =
  'text-xs text-balance leading-relaxed tracking-normal';

type ItemDescriptionHierarchyProps = {
  doc: ItemDescriptionDoc;
  className?: string;
  /** Shown between segments (default: `>` with muted styling). */
  separator?: React.ReactNode;
};

export function ItemDescriptionHierarchy({
  doc,
  className,
  separator,
}: ItemDescriptionHierarchyProps) {
  const segments = getItemDescriptionSegments(doc);
  if (segments.length > 0) {
    const defaultSep = (
      <span
        className='text-muted-foreground select-none whitespace-nowrap'
        aria-hidden
      >
        {' > '}
      </span>
    );
    const sep = separator ?? defaultSep;
    return (
      <span
        className={cn(
          'min-w-0 text-foreground break-words [overflow-wrap:anywhere]',
          HIERARCHY_BODY_CLASS,
          className
        )}
      >
        {segments.map((s, i) => (
          <React.Fragment key={s.id || `${i}-${s.label}`}>
            {i > 0 ? sep : null}
            <span
              className={cn(
                i === segments.length - 1 ? 'font-medium' : undefined
              )}
            >
              {s.label}
            </span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  const text = flattenItemDescription(doc);
  if (!text) {
    return null;
  }
  return (
    <span
      className={cn(
        'min-w-0 break-words text-foreground [overflow-wrap:anywhere]',
        HIERARCHY_BODY_CLASS,
        className
      )}
    >
      {text}
    </span>
  );
}
