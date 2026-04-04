'use client';

import {
  HydrationBoundary,
  HydrationBoundaryProps,
} from '@tanstack/react-query';
import { PropsWithChildren } from 'react';

export function QueryHydration({
  state,
  children,
}: PropsWithChildren<{ state: HydrationBoundaryProps['state'] }>) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
