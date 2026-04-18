'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface UserRoleRow {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystemRole: boolean;
}

export function useUserRolesQuery(
  tenantMemberId: string | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ['user-roles', tenantMemberId],
    queryFn: async (): Promise<UserRoleRow[]> => {
      if (!tenantMemberId) {
        return [];
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .schema('authz')
        .from('tenant_member_roles')
        .select('tenant_role_id, tenant_roles(id, name, slug, is_system)')
        .eq('tenant_member_id', tenantMemberId);
      if (error) {
        throw error;
      }
      const rows: UserRoleRow[] = [];
      for (const row of data ?? []) {
        const r = row as {
          tenant_role_id: string;
          tenant_roles:
            | { id: string; name: string; slug: string; is_system: boolean }
            | null;
        };
        const role = r.tenant_roles;
        if (!role) {
          continue;
        }
        rows.push({
          roleId: role.id,
          roleCode: role.slug,
          roleName: role.name,
          isSystemRole: role.is_system,
        });
      }
      return rows;
    },
    enabled: Boolean(enabled && tenantMemberId),
    staleTime: 0,
  });
}
