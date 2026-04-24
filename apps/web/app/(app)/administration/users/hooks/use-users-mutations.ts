'use client';

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  assignTenantMemberRole,
  removeTenantMemberRole,
  updateTenantMemberDirectory,
  type AssignRoleInput,
  type RemoveRoleInput,
  type UpdateTenantMemberDirectoryInput,
} from '../api/users-mutations-api';

import { USERS_TABLE_ID } from './use-users-query';

export type AssignRoleVariables = AssignRoleInput;

export type RemoveRoleVariables = RemoveRoleInput;

function invalidateUsersListAndMemberRoles(
  queryClient: QueryClient,
  tenantMemberId: string
): void {
  void queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] });
  void queryClient.invalidateQueries({
    queryKey: ['user-roles', tenantMemberId],
  });
}

function useAssignRole(options?: {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AssignRoleInput) =>
      assignTenantMemberRole(createSupabaseBrowserClient(), request),
    onSuccess: (_, variables) => {
      invalidateUsersListAndMemberRoles(queryClient, variables.tenantMemberId);
      if (!options?.suppressSuccessToast) {
        toast.success('Role assigned successfully');
      }
    },
    onError: (error) => {
      if (!options?.suppressErrorToast) {
        const message =
          error instanceof Error ? error.message : 'Failed to assign role.';
        toast.error(message);
      }
      console.error('Assign role error:', error);
    },
  });
}

function useRemoveRole(options?: {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RemoveRoleInput) =>
      removeTenantMemberRole(createSupabaseBrowserClient(), request),
    onSuccess: (_, variables) => {
      invalidateUsersListAndMemberRoles(queryClient, variables.tenantMemberId);
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

function useUpdateTenantMemberDirectoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTenantMemberDirectoryInput) =>
      updateTenantMemberDirectory(createSupabaseBrowserClient(), input),
    onSuccess: (_, variables) => {
      invalidateUsersListAndMemberRoles(queryClient, variables.tenantMemberId);
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

export {
  useAssignRole,
  useRemoveRole,
  useUpdateTenantMemberDirectoryMutation,
};

export type { UpdateTenantMemberDirectoryInput };
