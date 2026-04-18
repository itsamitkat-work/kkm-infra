'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { USERS_TABLE_ID } from './use-users-query';

export type RemoveRoleVariables = {
  roleId: string;
  tenantMemberId: string;
};

async function removeRole(request: RemoveRoleVariables): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .schema('authz')
    .from('tenant_member_roles')
    .delete()
    .eq('tenant_member_id', request.tenantMemberId)
    .eq('tenant_role_id', request.roleId);
  if (error) {
    throw error;
  }
}

export function useRemoveRole(options?: {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeRole,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] });
      void queryClient.invalidateQueries({
        queryKey: ['user-roles', variables.tenantMemberId],
      });
      if (!options?.suppressSuccessToast) {
        toast.success('Role removed successfully');
      }
    },
    onError: (error) => {
      if (!options?.suppressErrorToast) {
        const message =
          error instanceof Error ? error.message : 'Failed to remove role.';
        toast.error(message);
      }
      console.error('Remove role error:', error);
    },
  });
}
