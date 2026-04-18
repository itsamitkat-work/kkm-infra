'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const MY_SWITCHABLE_TENANTS_QUERY_KEY = ['my-switchable-tenants'] as const;

export type SwitchableTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
};

async function fetchSwitchableTenants(): Promise<SwitchableTenantRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_my_switchable_tenants');
  if (error) {
    throw error;
  }
  return (data ?? []) as SwitchableTenantRow[];
}

export function useMySwitchableTenants(enabled: boolean) {
  return useQuery({
    queryKey: MY_SWITCHABLE_TENANTS_QUERY_KEY,
    queryFn: fetchSwitchableTenants,
    enabled,
  });
}
