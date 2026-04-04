import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export type ProjectStatus = {
  hashid: string;
  name: string;
};

export const fetchProjectStatus = async (): Promise<
  PaginationResponse<ProjectStatus>
> => {
  return apiFetch<PaginationResponse<ProjectStatus>>('/v2/projectstatus');
};

export const useProjectStatus = () => {
  return useQuery({
    queryKey: ['projectStatus'],
    queryFn: () => fetchProjectStatus(),
  });
};
