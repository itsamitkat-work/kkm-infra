'use client';

import * as React from 'react';
import type { Database } from '@kkm/db';
import { cn } from '@/lib/utils';

export type RecordStatusValue =
  | Database['public']['Enums']['record_status']
  | null
  | undefined;

type RecordStatusConfig = {
  dotClass: string;
  label: string;
};

const RECORD_STATUS_CONFIG: Record<
  Database['public']['Enums']['record_status'],
  RecordStatusConfig
> = {
  active: {
    dotClass: 'bg-emerald-500',
    label: 'Active',
  },
  inactive: {
    dotClass: 'bg-slate-500',
    label: 'Inactive',
  },
  deprecated: {
    dotClass: 'bg-amber-500',
    label: 'Deprecated',
  },
};

/** DB `record_status` enum values — single source for forms, filters, and Zod. */
export const RECORD_STATUS_FORM_VALUES = [
  'active',
  'inactive',
  'deprecated',
] as const satisfies readonly Database['public']['Enums']['record_status'][];

const RECORD_STATUS_ORDER: Database['public']['Enums']['record_status'][] = [
  ...RECORD_STATUS_FORM_VALUES,
];

/** Select / multiselect options: `value` is DB enum, `label` is display text. */
export const RECORD_STATUS_OPTIONS = RECORD_STATUS_FORM_VALUES.map((key) => ({
  value: key,
  label: RECORD_STATUS_CONFIG[key].label,
}));

export const RECORD_STATUS_FILTER_OPTIONS = RECORD_STATUS_FORM_VALUES.map(
  (key) => ({
    value: key,
    label: RECORD_STATUS_CONFIG[key].label,
    dotClass: RECORD_STATUS_CONFIG[key].dotClass,
  })
);

export function RecordStatusDot({
  dotClass,
  className,
}: {
  dotClass: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'size-1.5 rounded-full border border-transparent',
        dotClass,
        className
      )}
      aria-hidden
    />
  );
}

export function isRecordStatus(
  value: string
): value is Database['public']['Enums']['record_status'] {
  return (RECORD_STATUS_FORM_VALUES as readonly string[]).includes(value);
}

const DEFAULT_CONFIG: RecordStatusConfig = {
  dotClass: 'bg-slate-500',
  label: '—',
};

function getRecordStatusConfig(
  status: RecordStatusValue,
  fallback: string
): RecordStatusConfig {
  if (status == null) {
    return { dotClass: DEFAULT_CONFIG.dotClass, label: fallback };
  }
  return RECORD_STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
}

export function formatRecordStatusLabel(value: RecordStatusValue): string {
  if (value == null) return '—';
  return RECORD_STATUS_CONFIG[value]?.label ?? '—';
}

export interface RecordStatusBadgeProps {
  status: RecordStatusValue;
  label?: string;
  className?: string;
  fallback?: string;
}

export function RecordStatusBadge({
  status,
  label,
  className = '',
  fallback = '—',
}: RecordStatusBadgeProps) {
  const config = React.useMemo(
    () => getRecordStatusConfig(status, fallback),
    [status, fallback]
  );

  const displayLabel = label || config.label || fallback;

  if (status === null || status === undefined) {
    if (!fallback || fallback === '—') {
      return null;
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <RecordStatusDot dotClass={config.dotClass} />
      <span className='text-sm font-semibold text-muted-foreground'>
        {displayLabel}
      </span>
    </div>
  );
}
