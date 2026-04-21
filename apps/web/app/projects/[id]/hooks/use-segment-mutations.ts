import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ProjectSegment,
  ProjectSegmentFormData,
  ProjectCreateSegmentData,
} from '@/types/projects';
import { toast } from 'sonner';
import { PROJECT_SEGMENTS_TABLE_ID } from './use-project-segments-query';
import {
  createProjectSegment,
  deleteProjectSegment,
  updateProjectSegment,
} from '@/lib/projects/project-segments-repo';

function handleSegmentMutationError(operation: string) {
  toast.error(`Failed to ${operation} segment. Please try again.`, {
    duration: Infinity,
  });
}

function invalidateSegmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string
) {
  queryClient.invalidateQueries({
    queryKey: ['projectSegments', projectId],
  });
  queryClient.invalidateQueries({
    queryKey: [PROJECT_SEGMENTS_TABLE_ID, projectId],
  });
  queryClient.invalidateQueries({ queryKey: ['project', projectId] });
}

export function useCreateSegment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (segment: ProjectCreateSegmentData): Promise<ProjectSegment> =>
      createProjectSegment(segment),
    retry: 3,
    mutationKey: ['createSegment'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      handleSegmentMutationError('create');
    },
    onSuccess: () => {
      toast.success('Segment created successfully!');
    },
    onSettled: () => {
      invalidateSegmentQueries(queryClient, projectId);
    },
  });
}

export function useUpdateSegment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (segment: ProjectSegmentFormData): Promise<ProjectSegment> =>
      updateProjectSegment(segment),
    retry: 3,
    mutationKey: ['updateSegment'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      handleSegmentMutationError('update');
    },
    onSuccess: () => {
      toast.success('Segment updated successfully!');
    },
    onSettled: () => {
      invalidateSegmentQueries(queryClient, projectId);
    },
  });
}

export function useDeleteSegment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (segmentId: string) =>
      deleteProjectSegment(projectId, segmentId),
    retry: 3,
    mutationKey: ['deleteSegment'],
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      handleSegmentMutationError('delete');
    },
    onSuccess: () => {
      toast.success('Segment deleted successfully!');
    },
    onSettled: () => {
      invalidateSegmentQueries(queryClient, projectId);
    },
  });
}
