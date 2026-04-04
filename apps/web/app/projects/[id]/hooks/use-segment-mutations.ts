import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ProjectSegment,
  ProjectSegmentFormData,
  ProjectCreateSegmentData,
  SegmentApiRequest,
  SegmentApiResponse,
} from '@/types/projects';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/apiClient';
import { PROJECT_SEGMENTS_TABLE_ID } from './use-project-segments-query';

async function createSegment(
  segment: ProjectCreateSegmentData
): Promise<ProjectSegment> {
  const requestData: SegmentApiRequest = {
    projectId: segment.projectId,
    segmentName: segment.segmentName,
    segmentType: segment.segmentType,
    description: segment.description,
    startDate: segment.startDate,
    endDate: segment.endDate,
    status: segment.status,
    displayOrder: segment.displayOrder,
  };

  const response = await apiFetch<SegmentApiResponse>(
    `/v2/project/${segment.projectId}/segment`,
    {
      method: 'POST',
      data: requestData,
    }
  );

  return response.data;
}

async function updateSegment(
  segment: ProjectSegmentFormData
): Promise<ProjectSegment> {
  if (!segment.id) {
    throw new Error('Segment ID is required for update');
  }

  const requestData: SegmentApiRequest = {
    id: segment.id,
    projectId: segment.projectId,
    segmentName: segment.segmentName,
    segmentType: segment.segmentType,
    description: segment.description,
    startDate: segment.startDate,
    endDate: segment.endDate,
    status: segment.status,
    displayOrder: segment.displayOrder,
    segmentId: segment.id,
  };

  const response = await apiFetch<SegmentApiResponse>(
    `/v2/project/${segment.projectId}/segment/${segment.id}`,
    {
      method: 'PUT',
      data: requestData,
    }
  );

  return response.data;
}

async function deleteSegment(
  projectId: string,
  segmentId: string
): Promise<void> {
  await apiFetch<void>(`/v2/project/${projectId}/segment/${segmentId}`, {
    method: 'DELETE',
  });
}

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
    mutationFn: createSegment,
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
    mutationFn: updateSegment,
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
    mutationFn: (segmentId: string) => deleteSegment(projectId, segmentId),
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
