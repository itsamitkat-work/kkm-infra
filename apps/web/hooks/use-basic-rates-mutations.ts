import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { BasicRate } from '@/hooks/use-basic-rates';
import { toast } from 'sonner';

export interface CreateBasicRateData {
  code: string;
  unit: string;
  name: string;
  nickName: string;
  rate: number;
  stateSchedule: string;
  types: string;
  status: string;
  autodate: string;
  userId: string;
  materialTypeHashId: string;
  materialGroupHashId: string;
  materialCategoryHashId: string;
}

export interface UpdateBasicRateData extends CreateBasicRateData {
  hashID: string;
}

export interface DeleteBasicRateData {
  hashID: string;
}

const createBasicRate = async (
  basicRate: CreateBasicRateData
): Promise<BasicRate> => {
  return await apiFetch<BasicRate>('/v2/basicrates', {
    method: 'POST',
    data: basicRate,
  });
};

const updateBasicRate = async (
  basicRate: UpdateBasicRateData
): Promise<BasicRate> => {
  return await apiFetch<BasicRate>('/v2/basicrates', {
    method: 'PUT',
    data: basicRate,
  });
};

const deleteBasicRate = async (
  basicRate: DeleteBasicRateData
): Promise<void> => {
  return await apiFetch<void>('/v2/basicrates', {
    method: 'DELETE',
    params: {
      hashID: basicRate.hashID,
    },
  });
};

export const useCreateBasicRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBasicRate,
    retry: 3,
    mutationKey: ['createBasicRate'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _newBasicRate) => {
      toast.error('Failed to create basic rate. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Basic rate created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['basic-rates'] });
    },
  });
};

export const useUpdateBasicRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBasicRate,
    retry: 3,
    mutationKey: ['updateBasicRate'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _updatedBasicRate) => {
      toast.error('Failed to update basic rate. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Basic rate updated successfully!');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['basic-rates'] });
      if (variables.hashID) {
        queryClient.invalidateQueries({
          queryKey: ['basic-rate', variables.hashID],
        });
      }
    },
  });
};

export const useDeleteBasicRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBasicRate,
    retry: 3,
    mutationKey: ['deleteBasicRate'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _basicRateData) => {
      toast.error('Failed to delete basic rate. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _basicRateData) => {
      toast.success('Basic rate deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['basic-rates'] });
    },
  });
};
