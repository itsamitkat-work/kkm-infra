import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { SubDesignation } from '@/app/(app)/administration/designations/hooks/use-sub-designations-query';
import { toast } from 'sonner';

export interface CreateSubDesignationData {
  designationHashID: string;
  employeeTypeHashID: string;
  code: string;
  name: string;
  basicRate: number;
  newRate: number;
  revisedDate: string;
  remarks: string;
  status: string;
  userId: number;
}

export interface UpdateSubDesignationData extends CreateSubDesignationData {
  hashId: string;
}

export interface DeleteSubDesignationData {
  hashId: string;
  designationHashID: string;
}

const createSubDesignation = async (
  subDesignation: CreateSubDesignationData
): Promise<SubDesignation> => {
  return await apiFetch<SubDesignation>('/v2/sub-designation', {
    method: 'POST',
    data: subDesignation,
  });
};

const updateSubDesignation = async (
  subDesignation: UpdateSubDesignationData
): Promise<SubDesignation> => {
  return await apiFetch<SubDesignation>('/v2/sub-designation', {
    method: 'PUT',
    data: subDesignation,
  });
};

const deleteSubDesignation = async (
  subDesignation: DeleteSubDesignationData
): Promise<void> => {
  const url = `/v2/sub-designation?hashId=${encodeURIComponent(subDesignation.hashId)}`;
  return await apiFetch<void>(url, {
    method: 'DELETE',
  });
};

export const useCreateSubDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubDesignation,
    retry: 3,
    mutationKey: ['createSubDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _newSubDesignation) => {
      toast.error('Failed to create sub-designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Sub-designation created successfully!');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sub-designations', variables.designationHashID],
      });
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
};

export const useUpdateSubDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubDesignation,
    retry: 3,
    mutationKey: ['updateSubDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _updatedSubDesignation) => {
      toast.error('Failed to update sub-designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Sub-designation updated successfully!');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sub-designations', variables.designationHashID],
      });
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      if (variables.hashId) {
        queryClient.invalidateQueries({
          queryKey: ['sub-designation', variables.hashId],
        });
      }
    },
  });
};

export const useDeleteSubDesignation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubDesignation,
    retry: 3,
    mutationKey: ['deleteSubDesignation'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: (_err, _subDesignationData) => {
      toast.error('Failed to delete sub-designation. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _subDesignationData) => {
      toast.success('Sub-designation deleted successfully!');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sub-designations', variables.designationHashID],
      });
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
};
