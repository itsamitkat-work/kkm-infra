'use client';

import { useAuth } from '@/hooks/auth/use-auth';

/** Returns the current user's role slugs from the Supabase session JWT (when custom claims exist). */
export function useMyRoles(): string[] {
  const { getUserPermissions } = useAuth();
  return getUserPermissions().roles ?? [];
}
