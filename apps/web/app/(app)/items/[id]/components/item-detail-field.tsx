'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';

export interface ItemDetailFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  copyable?: boolean;
}

export function ItemDetailField({
  label,
  value,
  className,
  copyable,
}: ItemDetailFieldProps) {
  const displayValue = value ?? (
    <span className='text-muted-foreground/50 italic'>N/A</span>
  );

  return (
    <div className={cn('space-y-1', className)}>
      <div className='text-xs font-medium text-muted-foreground'>{label}</div>
      <div className='flex items-center gap-2 text-sm font-medium leading-none break-words text-foreground'>
        {displayValue}
        {copyable && value != null && value !== '' && (
          <CopyButton content={String(value)} />
        )}
      </div>
    </div>
  );
}
