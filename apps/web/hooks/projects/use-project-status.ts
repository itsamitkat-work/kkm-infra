import React, { useMemo } from 'react';
import { PROJECT_STATUS } from '@/types/projects';

export interface StatusConfig {
  icon?: React.ReactElement;
  variant: 'default' | 'secondary' | 'outline';
  className: string;
  dotClass: string;
}

// Status configuration mapping
const STATUS_CONFIG_MAP = {
  [PROJECT_STATUS.ACTIVE]: {
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-emerald-500',
  },
  [PROJECT_STATUS.CLOSED]: {
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    dotClass: 'bg-slate-500',
  },
  [PROJECT_STATUS.ONHOLD]: {
    variant: 'outline' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotClass: 'bg-amber-500',
  },
} as const;

// Default configuration for unknown statuses
const DEFAULT_CONFIG = {
  icon: null,
  variant: 'outline' as const,
  className: 'bg-gray-100 text-gray-600 border-gray-200',
  dotClass: 'bg-slate-500',
} as const;

// Helper function to create status config
const createStatusConfig = (status: string): StatusConfig => {
  const config =
    STATUS_CONFIG_MAP[status as keyof typeof STATUS_CONFIG_MAP] ||
    DEFAULT_CONFIG;

  return {
    variant: config.variant,
    className: config.className,
    dotClass: config.dotClass,
  };
};

export const useProjectStatus = (status: string): StatusConfig => {
  return useMemo(() => createStatusConfig(status), [status]);
};

export const useProjectStatusSmall = (status: string): StatusConfig => {
  return useMemo(() => createStatusConfig(status), [status]);
};

export const getStatusConfig = (status: string): StatusConfig => {
  return createStatusConfig(status);
};
