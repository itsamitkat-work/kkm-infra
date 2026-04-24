'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  createBasicRate,
  deleteBasicRate,
  updateBasicRate,
  type CreateBasicRateInput,
  type UpdateBasicRateInput,
} from '../api/basic-rate-api';

import { invalidateBasicRateQueryCache } from './use-basic-rates-query';

function useCreateBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBasicRateInput) =>
      createBasicRate(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate created.'),
    onSettled: () => invalidateBasicRateQueryCache(queryClient),
  });
}

function useUpdateBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBasicRateInput) =>
      updateBasicRate(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate updated.'),
    onSettled: () => invalidateBasicRateQueryCache(queryClient),
  });
}

function useDeleteBasicRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteBasicRate(createSupabaseBrowserClient(), id),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete basic rate.', { duration: Infinity }),
    onSuccess: () => toast.success('Basic rate deleted.'),
    onSettled: () => invalidateBasicRateQueryCache(queryClient),
  });
}

export { useCreateBasicRate, useUpdateBasicRate, useDeleteBasicRate };
