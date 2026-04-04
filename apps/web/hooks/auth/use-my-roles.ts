'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/auth/use-auth';

/** Returns the current user's roles, memoized once per mount. */
export function useMyRoles(): string[] {
  const { getUserPermissions } = useAuth();
  return React.useMemo(
    () => getUserPermissions().roles ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per mount
    []
  );
}
