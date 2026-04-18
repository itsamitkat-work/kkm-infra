'use client';

import type { ReactNode } from 'react';

import { RequireSystemAdmin } from '@/components/auth/require-system-admin';

export default function SystemAdministrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireSystemAdmin>{children}</RequireSystemAdmin>;
}
