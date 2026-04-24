'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  fetchUserRolesForMember,
  type UserRoleRow,
} from '../api/user-roles-api';

function useUserRolesQuery(
  tenantMemberId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['user-roles', tenantMemberId],
    queryFn: ({ signal }) => {
      if (!tenantMemberId) {
        return Promise.resolve([]);
      }
      return fetchUserRolesForMember(
        createSupabaseBrowserClient(),
        tenantMemberId,
        signal
      );
    },
    enabled: Boolean(enabled && tenantMemberId),
    staleTime: 0,
  });
}

export { useUserRolesQuery };

export type { UserRoleRow };
