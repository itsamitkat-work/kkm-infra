import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { ProjectItemRowType } from '@/types/project-item';
import { toast } from 'sonner';

interface CreateProjectItemPayload extends Omit<
  UpdateProjectItemPayload,
  'hashId'
> {
  projectId: string;
  suppressToast?: boolean;
}

interface UpdateProjectItemPayload {
  hashId: string;
  rate?: number;
  quantity?: number;
  remarks?: string | null;
  srNo?: string | null;
  dsrCode?: string | null;
  name?: string;
  code?: string;
  unit?: string;
  scheduleName?: string | null;
  segmentHashIds?: string[];
  suppressToast?: boolean;
}

const createProjectItem = async (
  item: CreateProjectItemPayload
): Promise<{ data: ProjectItemRowType }> => {
  const { suppressToast: _suppressToast, ...payload } = item;
  return await apiFetch<{ data: ProjectItemRowType }>('/v2/project/item', {
    method: 'POST',
    data: payload,
  });
};

const updateProjectItem = async (
  item: UpdateProjectItemPayload
): Promise<{ data: ProjectItemRowType }> => {
  const { suppressToast: _suppressToast, ...payload } = item;
  return await apiFetch<{ data: ProjectItemRowType }>('/v2/project/item', {
    method: 'PUT',
    data: payload,
  });
};

interface DeleteProjectItemOptions {
  suppressToast?: boolean;
}

const deleteProjectItem = async (
  itemId: string,
  _options?: DeleteProjectItemOptions
): Promise<void> => {
  return await apiFetch<void>(`/v2/project/item/${itemId}`, {
    method: 'DELETE',
  });
};
export const useCreateProjectItem = (_projectId: string) => {
  return useMutation({
    mutationFn: createProjectItem,
    retry: 0,
    mutationKey: ['createProjectItem'],
    onMutate: (variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.loading('Creating new item...');
      }
    },
    onError: (error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
      }
    },
    onSuccess: (data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item created successfully!');
      }
    },
  });
};

export const useUpdateProjectItem = (_projectId: string) => {
  return useMutation({
    mutationFn: updateProjectItem,
    retry: 0,
    mutationKey: ['updateProjectItem'],
    onMutate: (variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.loading('Saving item...');
      }
    },
    onError: (error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
      }
    },
    onSuccess: (data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item saved successfully!');
      }
    },
  });
};

export const useDeleteProjectItem = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      suppressToast,
    }: {
      itemId: string;
      suppressToast?: boolean;
    }) => deleteProjectItem(itemId, { suppressToast }),
    retry: 0,
    mutationKey: ['deleteProjectItem'],
    onMutate: (variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.loading('Deleting item...');
      }
    },
    onSuccess: (data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item deleted successfully!');
      }
      queryClient.invalidateQueries({
        queryKey: ['project-items', projectId],
      });
    },
    onError: (error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.error('Failed to delete item. Please try again.');
      }
    },
  });
};
