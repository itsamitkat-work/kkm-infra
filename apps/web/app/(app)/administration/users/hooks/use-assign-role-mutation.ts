'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { USERS_TABLE_ID } from './use-users-query';
import { toast } from 'sonner';

interface AssignRoleRequest {
  roleId: string;
  userId: string;
}

interface AssignRoleResponse {
  isSuccess: boolean;
  message: string;
  statusCode: number;
}

const assignRole = async (
  request: AssignRoleRequest
): Promise<AssignRoleResponse> => {
  const response = await apiFetch<AssignRoleResponse>('v2/assignrole', {
    method: 'POST',
    data: {
      roleId: request.roleId,
      userId: request.userId,
    },
  });

  return response;
};

export const useAssignRole = (options?: {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignRole,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] });
      queryClient.invalidateQueries({
        queryKey: ['user-roles', variables.userId],
      });
      if (!options?.suppressSuccessToast) {
        toast.success('Role assigned successfully');
      }
    },
    onError: (error) => {
      if (!options?.suppressErrorToast) {
        toast.error('Failed to assign role. Please try again.');
      }
      console.error('Assign role error:', error);
    },
  });
};
