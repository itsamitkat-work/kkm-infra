'use client';

import type { ReactNode } from 'react';

import type { AppAction, AppSubject } from '@/lib/authz/define-ability';
import { useAuth } from '@/hooks/auth';

import { RouteGuard } from '@/components/auth/route-guard';

type RequireAbilityProps = {
  children: ReactNode;
  action: AppAction;
  subject: AppSubject;
  fallbackHref?: string;
};

/**
 * CASL-based gate for tenant users (and system admins, who receive full
 * `manage` on subjects via `defineAbilityFor`). Pair with a route-group
 * `layout.tsx` for any subtree that needs the same `action` + `subject`.
 *
 * For compound rules (e.g. read OR manage), use `RouteGuard` in the layout
 * with `allow={canRead || canManage}` from `useAuth().ability`.
 */
export function RequireAbility({
  children,
  action,
  subject,
  fallbackHref,
}: RequireAbilityProps) {
  const { ability, isLoading } = useAuth();
  const allow = ability.can(action, subject);

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
