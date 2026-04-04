import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Client } from '@/hooks/clients/use-clients';
import { toast } from 'sonner';

export interface CreateClientData {
  name: string;
  address: string;
  contact: string;
  web: string;
  gstin: string;
  scheduleName: string;
  fullName: string;
  area: string;
  mdcontact: string;
  cpcontact: string;
}

export interface UpdateClientData extends CreateClientData {
  hashId: string;
}

export interface DeleteClientData {
  hashId: string;
}

const createClient = async (client: CreateClientData): Promise<Client> => {
  return await apiFetch<Client>('/v2/client', {
    method: 'POST',
    data: client,
  });
};

const updateClient = async (client: UpdateClientData): Promise<Client> => {
  return await apiFetch<Client>('/v2/client', {
    method: 'PUT',
    data: client,
  });
};

const deleteClient = async (client: DeleteClientData): Promise<void> => {
  return await apiFetch<void>('/v2/client', {
    method: 'DELETE',
    params: {
      hashId: client.hashId,
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    retry: 3,
    mutationKey: ['createClient'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _newClient) => {
      toast.error('Failed to create client. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Client created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    retry: 3,
    mutationKey: ['updateClient'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _updatedClient) => {
      toast.error('Failed to update client. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Client updated successfully!');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (variables.hashId) {
        queryClient.invalidateQueries({
          queryKey: ['client', variables.hashId],
        });
      }
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    retry: 3,
    mutationKey: ['deleteClient'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _clientData) => {
      toast.error('Failed to delete client. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _clientData) => {
      toast.success('Client deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
