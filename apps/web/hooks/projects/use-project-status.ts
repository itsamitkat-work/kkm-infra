import React, { useMemo } from 'react';
import { projectDbStatusLabel, PROJECT_DB_STATUS } from '@/types/projects';

export interface StatusConfig {
  icon?: React.ReactElement;
  variant: 'default' | 'secondary' | 'outline';
  className: string;
  dotClass: string;
}

const STATUS_CONFIG_MAP: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'outline';
    className: string;
    dotClass: string;
  }
> = {
  [PROJECT_DB_STATUS.ACTIVE]: {
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-emerald-500',
  },
  [PROJECT_DB_STATUS.CLOSED]: {
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    dotClass: 'bg-slate-500',
  },
  [PROJECT_DB_STATUS.ON_HOLD]: {
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotClass: 'bg-amber-500',
  },
  Active: {
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-emerald-500',
  },
  Closed: {
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    dotClass: 'bg-slate-500',
  },
  'On Hold': {
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotClass: 'bg-amber-500',
  },
};

const DEFAULT_CONFIG = {
  icon: null,
  variant: 'outline' as const,
  className: 'bg-gray-100 text-gray-600 border-gray-200',
  dotClass: 'bg-slate-500',
};

function createStatusConfig(status: string): StatusConfig {
  const key = status.trim();
  const config = STATUS_CONFIG_MAP[key] || DEFAULT_CONFIG;

  return {
    variant: config.variant,
    className: config.className,
    dotClass: config.dotClass,
  };
}

export const useProjectStatus = (status: string): StatusConfig => {
  return useMemo(() => createStatusConfig(status), [status]);
};

export const useProjectStatusSmall = (status: string): StatusConfig => {
  return useMemo(() => createStatusConfig(status), [status]);
};

export const getStatusConfig = (status: string): StatusConfig => {
  return createStatusConfig(status);
};

export function projectStatusDisplayLabel(status: string | null | undefined): string {
  if (!status) return '—';
  const s = status.trim();
  if (s === PROJECT_DB_STATUS.ACTIVE) return projectDbStatusLabel(s);
  if (s === PROJECT_DB_STATUS.ON_HOLD) return projectDbStatusLabel(s);
  if (s === PROJECT_DB_STATUS.CLOSED) return projectDbStatusLabel(s);
  return status;
}
