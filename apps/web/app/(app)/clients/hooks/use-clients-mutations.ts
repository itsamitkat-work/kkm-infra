'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  createClient,
  deleteClient,
  updateClient,
  type CreateClientInput,
  type UpdateClientInput,
} from '../api/client-api';

import { invalidateClientsQueryCache } from './use-clients-query';

function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      createClient(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client created.'),
    onSettled: () => invalidateClientsQueryCache(queryClient),
  });
}

function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) =>
      updateClient(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client updated.'),
    onSettled: () => invalidateClientsQueryCache(queryClient),
  });
}

function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(createSupabaseBrowserClient(), id),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client deleted.'),
    onSettled: () => invalidateClientsQueryCache(queryClient),
  });
}

export { useCreateClient, useDeleteClient, useUpdateClient };

export type { CreateClientInput, UpdateClientInput };
