import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Project, ProjectFormData, CreateProjectData } from '@/types/projects';
import { toast } from 'sonner';

const createProject = async (project: CreateProjectData): Promise<Project> => {
  return await apiFetch<Project>('/v2/project', {
    method: 'POST',
    data: project,
  });
};

const updateProject = async (project: ProjectFormData): Promise<Project> => {
  return await apiFetch<Project>('/v2/project', {
    method: 'PUT',
    data: project,
  });
};

const deleteProject = async (projectId: string): Promise<void> => {
  return await apiFetch<void>(`/v2/project/${projectId}`, {
    method: 'DELETE',
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    retry: 3,
    mutationKey: ['createProject'],
    onMutate: () => {
      // Dismiss any existing toasts before starting new mutation
      toast.dismiss();
    },
    onError: (_err, _newProject) => {
      toast.error('Failed to create project. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Project created successfully!');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    retry: 3,
    mutationKey: ['updateProject'],
    onMutate: () => {
      // Dismiss any existing toasts before starting new mutation
      toast.dismiss();
    },
    onError: (_err, _updatedProject) => {
      toast.error('Failed to update project. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _variables) => {
      toast.success('Project updated successfully!');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: ['project', parseInt(variables.id)],
        });
      }
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    retry: 3,
    mutationKey: ['deleteProject'],
    onMutate: () => {
      // Dismiss any existing toasts before starting new mutation
      toast.dismiss();
    },
    onError: (_err, _projectId) => {
      toast.error('Failed to delete project. Please try again.', {
        duration: Infinity,
      });
    },
    onSuccess: (_data, _projectId) => {
      toast.success('Project deleted successfully!');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
