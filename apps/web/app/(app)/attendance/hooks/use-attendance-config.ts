'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AttendanceConfig,
  GlobalConfig,
  ProjectConfig,
  fetchAttendanceConfig,
  fetchProjectConfig,
  updateGlobalConfig,
  updateProjectConfig,
} from '../config/attendance-config';

export const ATTENDANCE_CONFIG_QUERY_KEY = ['attendance-config'];

export function useAttendanceConfig() {
  const queryClient = useQueryClient();

  const query = useQuery<AttendanceConfig>({
    queryKey: ATTENDANCE_CONFIG_QUERY_KEY,
    queryFn: fetchAttendanceConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateGlobalMutation = useMutation({
    mutationFn: (config: Partial<GlobalConfig>) => updateGlobalConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_CONFIG_QUERY_KEY });
      toast.success('Global configuration updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update global configuration');
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      config,
    }: {
      projectId: string;
      config: Omit<ProjectConfig, 'projectId'>;
    }) => updateProjectConfig(projectId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_CONFIG_QUERY_KEY });
      toast.success('Project configuration updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project configuration');
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateGlobal: updateGlobalMutation.mutate,
    updateProject: updateProjectMutation.mutate,
    isUpdatingGlobal: updateGlobalMutation.isPending,
    isUpdatingProject: updateProjectMutation.isPending,
  };
}
export function useProjectConfig(projectId: string | null) {
  return useQuery({
    queryKey: [...ATTENDANCE_CONFIG_QUERY_KEY, 'project', projectId],
    queryFn: () => fetchProjectConfig(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}
