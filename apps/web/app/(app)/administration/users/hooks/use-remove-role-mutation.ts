'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { USERS_TABLE_ID } from './use-users-query';
import { toast } from 'sonner';

interface RemoveRoleRequest {
  roleId: string;
  userId: string;
}

interface RemoveRoleResponse {
  isSuccess: boolean;
  message: string;
  statusCode: number;
}

const removeRole = async (
  request: RemoveRoleRequest
): Promise<RemoveRoleResponse> => {
  const response = await apiFetch<RemoveRoleResponse>('v2/removerole', {
    method: 'POST',
    data: {
      roleId: request.roleId,
      userId: request.userId,
    },
  });

  return response;
};

export const useRemoveRole = (options?: {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] });
      queryClient.invalidateQueries({
        queryKey: ['user-roles', variables.userId],
      });
      if (!options?.suppressSuccessToast) {
        toast.success('Role removed successfully');
      }
    },
    onError: (error) => {
      if (!options?.suppressErrorToast) {
        toast.error('Failed to remove role. Please try again.');
      }
      console.error('Remove role error:', error);
    },
  });
};
