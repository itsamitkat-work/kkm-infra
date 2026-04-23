import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateProjectTabCounts } from '@/hooks/projects/use-project-tab-counts-query';
import { ProjectItemRowType } from '@/types/project-item';
import { toast } from 'sonner';
import {
  createProjectBoqLine,
  deleteProjectBoqLine,
  patchProjectBoqLine,
  type CreateBoqLineInput,
  type UpdateBoqLineInput,
} from '@/lib/projects/project-boq-repo';

export type CreateProjectItemPayload = Omit<CreateBoqLineInput, 'signal'> & {
  suppressToast?: boolean;
};

/**
 * Partial BOQ line body for `patchProjectItem` (PostgREST PATCH via Supabase `.update()`).
 * Include only fields that changed; `id` and `project_id` are required.
 */
export type UpdateProjectItemPayload = Omit<UpdateBoqLineInput, 'signal'> & {
  suppressToast?: boolean;
};

const createProjectItem = async (
  item: CreateProjectItemPayload
): Promise<{ data: ProjectItemRowType }> => {
  const { suppressToast: _suppressToast, ...input } = item;
  if (!input.schedule_item_id?.trim()) {
    throw new Error('A schedule item must be selected before saving.');
  }
  const row = await createProjectBoqLine(input);
  return { data: row };
};

const patchProjectItem = async (
  item: UpdateProjectItemPayload
): Promise<{ data: ProjectItemRowType }> => {
  const { suppressToast: _suppressToast, ...input } = item;
  if (!input.project_id) {
    throw new Error('project_id is required to update a project item.');
  }
  const row = await patchProjectBoqLine(input);
  return { data: row };
};

interface DeleteProjectItemOptions {
  suppressToast?: boolean;
}

const deleteProjectItem = async (
  itemId: string,
  projectId: string,
  _options?: DeleteProjectItemOptions
): Promise<void> => {
  await deleteProjectBoqLine(itemId, projectId);
};

export const useCreateProjectItem = (projectId: string) => {
  const queryClient = useQueryClient();
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
    onError: (_error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
      }
    },
    onSuccess: (data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item created successfully!');
      }
      queryClient.invalidateQueries({
        queryKey: ['project-items', variables.project_id],
      });
      invalidateProjectTabCounts(queryClient, variables.project_id);
      queryClient.invalidateQueries({ queryKey: ['estimation'] });
    },
  });
};

/** Persists BOQ line changes via PATCH (partial `project_boq_lines` update). */
export const useUpdateProjectItem = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchProjectItem,
    retry: 0,
    mutationKey: ['patchProjectItem'],
    onMutate: (variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.loading('Saving item...');
      }
    },
    onError: (_error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
      }
    },
    onSuccess: (_data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item saved successfully!');
      }
      const pid = variables.project_id ?? projectId;
      queryClient.invalidateQueries({
        queryKey: ['project-items', pid],
      });
      invalidateProjectTabCounts(queryClient, pid);
      queryClient.invalidateQueries({ queryKey: ['estimation'] });
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
    }) => deleteProjectItem(itemId, projectId, { suppressToast }),
    retry: 0,
    mutationKey: ['deleteProjectItem'],
    onMutate: (variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.loading('Deleting item...');
      }
    },
    onSuccess: (_data, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.success('Item deleted successfully!');
      }
      queryClient.invalidateQueries({
        queryKey: ['project-items', projectId],
      });
      invalidateProjectTabCounts(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: ['estimation'] });
    },
    onError: (_error, variables) => {
      if (!variables.suppressToast) {
        toast.dismiss();
        toast.error('Failed to delete item. Please try again.');
      }
    },
  });
};
