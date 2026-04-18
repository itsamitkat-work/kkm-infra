import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import type { Designation } from '@/types/legacy-designations-api';
import { toast } from 'sonner';

export interface CreateDesignationData {
  employeeTypeHashID: string;
  code: string;
  name: string;
  basicRate: string;
  remarks: string;
  status: string;
}

export interface UpdateDesignationData extends CreateDesignationData {
  hashId: string;
  userId: number;
}

export interface DeleteDesignationData {
  hashId: string;
}

const createDesignation = async (
  designation: CreateDesignationData
): Promise<Designation> => {
  return await apiFetch<Designation>('/v2/designation', {
    method: 'POST',
    data: designation,
  });
};

const updateDesignation = async (
  designation: UpdateDesignationData
): Promise<Designation> => {
  return await apiFetch<Designation>('/v2/designation', {
    method: 'PUT',
    data: designation,
  });
};

const deleteDesignation = async (
  designation: DeleteDesignationData
): Promise<void> => {
  const url = `/v2/designation?hashId=${encodeURIComponent(designation.hashId)}`;
  return await apiFetch<void>(url, {
    method: 'DELETE',
  });
};

export const useCreateDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDesignation,
    retry: 3,
    mutationKey: ['createDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _newDesignation) => {
      toast.error('Failed to create designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Designation created successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
};

export const useUpdateDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDesignation,
    retry: 3,
    mutationKey: ['updateDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _updatedDesignation) => {
      toast.error('Failed to update designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Designation updated successfully!');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      if (variables.hashId) {
        queryClient.invalidateQueries({
          queryKey: ['designation', variables.hashId],
        });
      }
    },
  });
};

export const useDeleteDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDesignation,
    retry: 3,
    mutationKey: ['deleteDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _designationData) => {
      toast.error('Failed to delete designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _designationData) => {
      toast.success('Designation deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
};
