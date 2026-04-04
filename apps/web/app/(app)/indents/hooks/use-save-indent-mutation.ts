'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postIndent, type IndentItemPayload } from '../api/indent-api';

export function useSaveIndentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: IndentItemPayload[]) => postIndent(items),
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
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to save indent.');
    },
  });
}
