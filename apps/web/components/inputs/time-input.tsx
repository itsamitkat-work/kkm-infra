'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function TimeInput({
  value,
  onChange,
  label,
  id,
  className,
  icon,
  disabled,
}: TimeInputProps) {
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
      <Input
        id={id}
        type='time'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='h-8 text-sm focus-visible:ring-1'
        disabled={disabled}
      />
    </div>
  );
}
