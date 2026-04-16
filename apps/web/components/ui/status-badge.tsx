'use client';

import * as React from 'react';

export type StatusType = 'active' | 'inactive' | 'active-status' | 'closed' | 'onhold' | string;

export interface StatusConfig {
  dotClass: string;
  label: string;
}

// Status configuration mapping for all entities
const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  // Boolean-based statuses
  active: {
    dotClass: 'bg-emerald-500',
    label: 'Active',
  },
  inactive: {
    dotClass: 'bg-slate-500',
    label: 'Inactive',
  },
  Inactive: {
    dotClass: 'bg-slate-500',
    label: 'Inactive',
  },
  // Project statuses
  'Active': {
    dotClass: 'bg-emerald-500',
    label: 'Active',
  },
  'Closed': {
    dotClass: 'bg-slate-500',
    label: 'Closed',
  },
  'On Hold': {
    dotClass: 'bg-amber-500',
    label: 'On Hold',
  },
  on_hold: {
    dotClass: 'bg-amber-500',
    label: 'On Hold',
  },
  closed: {
    dotClass: 'bg-slate-500',
    label: 'Closed',
  },
  // Project segment statuses
  'Draft': {
    dotClass: 'bg-slate-500',
    label: 'Draft',
  },
  'Completed': {
    dotClass: 'bg-blue-500',
    label: 'Completed',
  },
  'Archived': {
    dotClass: 'bg-amber-500',
    label: 'Archived',
  },
} as const;

// Default configuration for unknown statuses
const DEFAULT_CONFIG: StatusConfig = {
  dotClass: 'bg-slate-500',
  label: 'Unknown',
};

// Helper function to get status config
function getStatusConfig(status: StatusType | boolean | null | undefined): StatusConfig {
  // Handle boolean (for isActive fields)
  if (typeof status === 'boolean') {
    return status ? STATUS_CONFIG_MAP.active : STATUS_CONFIG_MAP.inactive;
  }

  // Handle null/undefined
  if (!status) {
    return STATUS_CONFIG_MAP.inactive;
  }

  // Handle string status
  const normalizedStatus = String(status).trim();
  return STATUS_CONFIG_MAP[normalizedStatus] || DEFAULT_CONFIG;
}

export interface StatusBadgeProps {
  /** Status value - can be boolean (isActive), string (status name), or null/undefined */
  status?: StatusType | boolean | null;
  /** Custom label override */
  label?: string;
  /** Custom className */
  className?: string;
  /** Fallback text when status is null/undefined */
  fallback?: string;
}

export function StatusBadge({
  status,
  label,
  className = '',
  fallback = '—',
}: StatusBadgeProps) {
  const config = React.useMemo(
    () => getStatusConfig(status),
    [status]
  );

  const displayLabel = label || config.label || fallback;

  // Don't render if status is null/undefined and no fallback
  if (status === null || status === undefined) {
    if (!fallback || fallback === '—') {
      return null;
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`size-1.5 rounded-full border border-transparent ${config.dotClass}`}
        aria-hidden
      />
      <span className='text-sm font-semibold text-muted-foreground'>
        {displayLabel}
      </span>
    </div>
  );
}

