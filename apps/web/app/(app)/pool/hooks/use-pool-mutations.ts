'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/hooks/auth';
import { toast } from 'sonner';
import { POOL_USERS_QUERY_ID } from './use-pool-users-query';
import { ASSIGNED_PROJECTS_QUERY_KEY } from '../../../../hooks/projects/use-assigned-projects-query';
import { PROJECT_USERS_QUERY_ID } from './use-project-users-query';

interface AssignWorkersRequest {
  userId: string;
  workerIds: string[];
  projectId: string;
  assignDate?: string;
}

interface AssignWorkersResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data?: {
    assignedCount: number;
    userHashId: string;
    projectId?: string;
    projectName?: string;
  };
}

const assignWorkersToUser = async (
  userId: string,
  workerIds: string[],
  projectId: string,
  assignDate?: string
): Promise<AssignWorkersResponse> => {
  // Use today's date at start of day (00:00:00) if no date provided
  // If assignDate is provided in YYYY-MM-DD format, append time at start of day
  let dateToUse: string;
  if (assignDate) {
    // If date is already in ISO format with time, use it as-is
    // Otherwise, if it's YYYY-MM-DD, append start of day time
    if (assignDate.includes('T')) {
      dateToUse = assignDate;
    } else {
      dateToUse = `${assignDate}T00:00:00.000Z`;
    }
  } else {
    // Default to today at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateToUse = today.toISOString();
  }

  const requestBody: AssignWorkersRequest = {
    userId,
    workerIds,
    projectId,
    assignDate: dateToUse,
  };

  const params = new URLSearchParams();
  params.append('assignDate', dateToUse);

  return apiFetch<AssignWorkersResponse>(
    `v2/resource-pool/assign?${params.toString()}`,
    {
      method: 'POST',
      data: requestBody,
    }
  );
};

// API function to release workers from user back to pool
interface ReleaseWorkersRequest {
  userId: string;
  workerIds: string[];
}

interface ReleaseWorkersResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data?: {
    releasedCount: number;
    userHashId: string;
  };
}

const releaseWorkersFromUser = async (
  userId: string,
  workerIds: string[]
): Promise<ReleaseWorkersResponse> => {
  const requestBody: ReleaseWorkersRequest = {
    userId,
    workerIds,
  };

  return apiFetch<ReleaseWorkersResponse>('v2/resource-pool/release', {
    method: 'POST',
    data: requestBody,
  });
};

export function usePoolMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [POOL_USERS_QUERY_ID] });
    queryClient.invalidateQueries({ queryKey: [ASSIGNED_PROJECTS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [PROJECT_USERS_QUERY_ID] });
  };

  const assignMutation = useMutation({
    mutationFn: async ({
      projectId,
      userIds,
      assignDate,
    }: {
      projectId: string;
      userIds: string[];
      assignDate?: string;
    }) => {
      if (!user?.hashId) throw new Error('User not authenticated');
      return assignWorkersToUser(user.hashId, userIds, projectId, assignDate);
    },
    onSuccess: (response) => {
      if (response.isSuccess) {
        toast.success(response.message);
        invalidateAll();
      } else {
        toast.error(response.message || 'Failed to assign users');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign users');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!user?.hashId) throw new Error('User not authenticated');
      return releaseWorkersFromUser(user.hashId, userIds);
    },
    onSuccess: (response) => {
      if (response.isSuccess) {
        toast.success(response.message);
        invalidateAll();
      } else {
        toast.error(response.message || 'Failed to release users');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to release users');
    },
  });

  const changeProjectMutation = useMutation({
    mutationFn: async ({
      targetProjectId,
      userIds,
      assignDate,
    }: {
      targetProjectId: string;
      userIds: string[];
      assignDate?: string;
    }) => {
      if (!user?.hashId) throw new Error('User not authenticated');
      return assignWorkersToUser(
        user.hashId,
        userIds,
        targetProjectId,
        assignDate
      );
    },
    onSuccess: (response) => {
      if (response.isSuccess) {
        toast.success(response.message);
        invalidateAll();
      } else {
        toast.error(response.message || 'Failed to change project');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change project');
    },
  });

  return {
    assignUsers: assignMutation.mutateAsync,
    releaseUsers: releaseMutation.mutateAsync,
    changeProject: changeProjectMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isReleasing: releaseMutation.isPending,
    isChanging: changeProjectMutation.isPending,
  };
}
