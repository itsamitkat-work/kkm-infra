'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postPrn, type PrnItemPayload } from '../api/prn-api';

export function useSavePrnMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: PrnItemPayload[]) => postPrn(items),
    onSuccess: (response) => {
      const { data } = response;
      const { total, success, failed } = data ?? {
        total: 0,
        success: 0,
        failed: 0,
      };
      const message = `${success} succeeded, ${failed} failed out of ${total} total`;
      if (failed > 0 && success === 0) {
        toast.error(message);
      } else if (failed > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }
      queryClient.invalidateQueries({ queryKey: ['item-basic-rates'] });
      queryClient.invalidateQueries({ queryKey: ['project-item-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['prns'] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to save PRN.');
    },
  });
}
