import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { Project } from '@/types/projects';

interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage: string | null;
  message: string | null;
  statusCode: number;
}

// API function to fetch a single project by hashId
const fetchProject = async (hashId: string): Promise<Project> => {
  const response = await apiFetch<ApiResponse<Project>>(
    `/v2/project/${hashId}`
  );
  return response.data;
};

export const useProject = (hashId: string | undefined) => {
  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', hashId],
    queryFn: () => fetchProject(hashId!),
    enabled: !!hashId, // Only run query if hashId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    // Raw project data from API
    project,

    // Loading states
    isLoading,
    isError,
    error,

    // Actions
    refetch,
  };
};
