'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Skeleton } from '@/components/ui/skeleton';

export type RouteGuardProps = {
  children: ReactNode;
  /** After `isLoading` is false, user may see `children` only when this is true. */
  allow: boolean;
  /** While true, no redirect; show fallback UI. */
  isLoading: boolean;
  /** Where to send users who are not allowed after auth is ready. */
  fallbackHref?: string;
};

/**
 * Shared client gate: redirect when session is ready and `allow` is false.
 * Compose with `useAuth()` for flags (`claims`) or CASL (`ability`), or any
 * derived `allow` from a layout-specific `useMemo`.
 *
 * Prefer a route-group `layout.tsx` that wraps `RouteGuard` so subtrees stay
 * thin without duplicating redirect/skeleton logic.
 */
export function RouteGuard({
  children,
  allow,
  isLoading,
  fallbackHref = '/dashboard',
}: RouteGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!allow) {
      router.replace(fallbackHref);
    }
  }, [allow, fallbackHref, isLoading, router]);

  if (isLoading || !allow) {
    return (
      <div className='p-6'>
        <Skeleton className='h-10 w-64 max-w-full' />
        <Skeleton className='mt-4 h-48 w-full max-w-3xl' />
      </div>
    );
  }

  return <>{children}</>;
}
