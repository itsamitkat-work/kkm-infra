'use client';

import { useAuth } from './use-auth';

export function useMyRoles(): string[] {
  const { roles } = useAuth();
  return roles;
}
