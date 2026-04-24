'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { USERS_TABLE_ID } from './use-users-query';

export type UpdateTenantMemberDirectoryInput = {
  tenantMemberId: string;
  userId: string;
  displayName: string;
  status: 'active' | 'suspended';
  /** Stored on `tenant_members.avatar_url` (e.g. data URL or HTTPS URL). */
  avatarUrl: string | null;
  /**
   * When set, also updates `public.profiles` (requires system admin or self per RLS).
   * Use the same display name / avatar you persist on the member row when syncing.
   */
  profilesSync?: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
};

async function updateTenantMemberDirectory(
  input: UpdateTenantMemberDirectoryInput,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { error: tmError } = await supabase
    .from('tenant_members')
    .update({
      display_name: input.displayName,
      status: input.status,
      avatar_url: input.avatarUrl,
    })
    .eq('id', input.tenantMemberId);

  if (tmError) {
    throw tmError;
  }

  if (input.profilesSync) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: input.profilesSync.displayName,
        username: input.profilesSync.username,
        avatar_url: input.profilesSync.avatarUrl,
      })
      .eq('id', input.userId);

    if (profileError) {
      throw profileError;
    }
  }
}

export function useUpdateTenantMemberDirectoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTenantMemberDirectory,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] });
      void queryClient.invalidateQueries({
        queryKey: ['user-roles', variables.tenantMemberId],
      });
      toast.success('User updated');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update user.';
      toast.error(message);
      console.error('updateTenantMemberDirectory', error);
    },
  });
}
