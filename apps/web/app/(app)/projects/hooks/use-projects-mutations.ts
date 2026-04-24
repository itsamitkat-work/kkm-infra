'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  createProject,
  deleteProject,
  updateProject,
  type CreateProjectApiInput,
  type UpdateProjectApiInput,
} from '../api/project-api';

import { projectDetailQueryKey } from './use-project-query';
import { invalidateProjectsQueryCache } from './use-projects-query';

function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectApiInput) =>
      createProject(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project created.'),
    onSettled: () => invalidateProjectsQueryCache(queryClient),
  });
}

function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectApiInput) =>
      updateProject(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project updated.'),
    onSettled: (_data, _error, variables) => {
      invalidateProjectsQueryCache(queryClient);
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKey(variables.projectId),
      });
    },
  });
}

function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      deleteProject(createSupabaseBrowserClient(), id),
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project deleted.'),
    onSettled: () => invalidateProjectsQueryCache(queryClient),
  });
}

export { useCreateProject, useDeleteProject, useUpdateProject };
