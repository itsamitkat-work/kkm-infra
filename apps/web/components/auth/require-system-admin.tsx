'use client';

import type { ReactNode } from 'react';

import { useAuth } from '@/hooks/auth';

import { RouteGuard } from '@/components/auth/route-guard';

type RequireSystemAdminProps = {
  children: ReactNode;
  /** Where to send users who are not system admins after auth is ready. */
  fallbackHref?: string;
};

/**
 * JWT `is_system_admin` gate. Prefer a route-group `layout.tsx` under e.g.
 * `administration/(system-admin)/` so pages stay free of auth boilerplate.
 */
export function RequireSystemAdmin({
  children,
  fallbackHref = '/dashboard',
}: RequireSystemAdminProps) {
  const { claims, isLoading } = useAuth();
  const allow = claims?.is_system_admin === true;

  return (
    <RouteGuard
      allow={allow}
      isLoading={isLoading}
      fallbackHref={fallbackHref}
    >
      {children}
    </RouteGuard>
  );
}
