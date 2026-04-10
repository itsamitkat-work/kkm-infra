'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth';
import {
  createPrnServiceItem,
  updatePrnServiceItem,
  type CreatePrnServiceItemPayload,
  type UpdatePrnServiceItemPayload,
} from '../../api/prn-api';

const PRN_SERVICE_ITEMS_QUERY_KEY = 'prn-service-items';
const PRN_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY = 'prn-service-items-by-project';

export function useCreatePrnServiceItemMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectItemHashId,
      userItemCode,
      userRequestedQuantity,
    }: {
      projectItemHashId: string;
      userItemCode: string;
      userRequestedQuantity: number;
    }) => {
      const makerHashId = user?.hashId;
      if (!makerHashId) throw new Error('User not found');
      const payload: CreatePrnServiceItemPayload = {
        projectHashId: projectId,
        projectItemHashId,
        makerHashId,
        userItemCode,
        userRequestedQuantity,
      };
      return createPrnServiceItem(payload);
    },
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success(res.message ?? 'PRN service item created.');
      } else {
        toast.error(res.message ?? 'Failed to create.');
      }
      queryClient.invalidateQueries({
        queryKey: [PRN_SERVICE_ITEMS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [PRN_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY, projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to create PRN service item.');
    },
  });
}

export function useUpdatePrnServiceItemMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      payload,
    }: {
      payload: Omit<
        UpdatePrnServiceItemPayload,
        'checkerHashID' | 'verifierHashID' | 'projectHashId' | 'makerHashId'
      >;
    }) => {
      const userHashId = user?.hashId;
      if (!userHashId) throw new Error('User not found');
      const fullPayload: UpdatePrnServiceItemPayload = {
        ...payload,
        projectHashId: projectId,
        makerHashId: userHashId,
        verifierHashID: payload.isVerified ? userHashId : undefined,
        checkerHashID: payload.isChecked ? userHashId : undefined,
      };
      return updatePrnServiceItem(fullPayload);
    },
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success(res.message ?? 'PRN service item updated.');
      } else {
        toast.error(res.message ?? 'Failed to update.');
      }
      queryClient.invalidateQueries({
        queryKey: [PRN_SERVICE_ITEMS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [PRN_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY, projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update PRN service item.');
    },
  });
}
