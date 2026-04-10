'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth';
import {
  createIndentServiceItem,
  updateIndentServiceItem,
  type CreateIndentServiceItemPayload,
  type UpdateIndentServiceItemPayload,
} from '../../api/indent-api';

const INDENT_SERVICE_ITEMS_QUERY_KEY = 'indent-service-items';
const INDENT_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY =
  'indent-service-items-by-project';

export function useCreateIndentServiceItemMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectItemId,
      serviceItemCode,
      serviceItemQty,
    }: {
      projectItemId: string;
      serviceItemCode: string;
      serviceItemQty: number;
    }) => {
      const makerHashId = user?.hashId;
      if (!makerHashId) throw new Error('User not found');
      const payload: CreateIndentServiceItemPayload = {
        projectId,
        projectItemId,
        serviceItemCode,
        serviceItemQty,
        makerHashId,
      };
      return createIndentServiceItem(projectItemId, payload);
    },
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success(res.message ?? 'Service item indent created.');
      } else {
        toast.error(res.message ?? 'Failed to create.');
      }
      queryClient.invalidateQueries({
        queryKey: [INDENT_SERVICE_ITEMS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [INDENT_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY, projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to create service item indent.');
    },
  });
}

export function useUpdateIndentServiceItemMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectItemId,
      payload,
    }: {
      projectItemId: string;
      payload: Omit<
        UpdateIndentServiceItemPayload,
        'verifierHashId' | 'checkerHashId'
      >;
    }) => {
      const userHashId = user?.hashId;
      if (!userHashId) throw new Error('User not found');
      const fullPayload: UpdateIndentServiceItemPayload = {
        ...payload,
        verifierHashId: payload.isVerified ? userHashId : undefined,
        checkerHashId: payload.isChecked ? userHashId : undefined,
      };
      return updateIndentServiceItem(
        projectItemId,
        fullPayload,
        undefined,
        projectId
      );
    },
    onSuccess: (res) => {
      if (res.isSuccess) {
        toast.success(res.message ?? 'Service item indent updated.');
      } else {
        toast.error(res.message ?? 'Failed to update.');
      }
      queryClient.invalidateQueries({
        queryKey: [INDENT_SERVICE_ITEMS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [INDENT_SERVICE_ITEMS_BY_PROJECT_QUERY_KEY, projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update service item indent.');
    },
  });
}
