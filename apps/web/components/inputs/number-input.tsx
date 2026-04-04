'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  id: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  label,
  id,
  prefix,
  suffix,
  min,
  max,
  className,
  icon,
  disabled,
}: NumberInputProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className='flex items-center gap-1.5 px-0.5'>
        {icon && <span className='text-muted-foreground/70'>{icon}</span>}
        <Label
          htmlFor={id}
          className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70'
        >
          {label}
        </Label>
      </div>
      <div className='relative'>
        {prefix && (
          <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type='number'
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(
            'h-8 text-sm focus-visible:ring-1',
            prefix && 'pl-6',
            suffix && 'pr-8'
          )}
          min={min}
          max={max}
          disabled={disabled}
        />
        {suffix && (
          <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground/60 select-none'>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
