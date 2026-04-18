'use client';

import { useQuery } from '@tanstack/react-query';
import type { Database } from '@kkm/db';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const MY_SWITCHABLE_TENANTS_QUERY_KEY = ['my-switchable-tenants'] as const;

export type SwitchableTenantRow =
  Database['public']['Functions']['list_my_switchable_tenants']['Returns'][number];

async function fetchSwitchableTenants(): Promise<SwitchableTenantRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_my_switchable_tenants');
  if (error) {
    throw error;
  }
  return data ?? [];
}

export function useMySwitchableTenants(enabled: boolean) {
  return useQuery({
    queryKey: MY_SWITCHABLE_TENANTS_QUERY_KEY,
    queryFn: fetchSwitchableTenants,
    enabled,
  });
}
