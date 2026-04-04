import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export interface Supervisor {
  hashId: string;
  name: string;
  projectCount: number;
}

export type SupervisorsResponse = PaginationResponse<Supervisor>;

export async function fetchSupervisorsByProjectEngineer(
  projectEngineerId: string,
  signal?: AbortSignal
): Promise<SupervisorsResponse> {
  return await apiFetch<SupervisorsResponse>(
    `v2/user/supervisors-by-project-engineer?projectEngineerId=${projectEngineerId}`,
    {
      method: 'GET',
      signal,
    }
  );
}

export interface ProjectEngineer {
  hashId: string;
  name: string;
  projectCount: number;
}

export type ProjectEngineersResponse = PaginationResponse<ProjectEngineer>;

export async function fetchProjectEngineersByProjectHead(
  projectHeadId: string,
  signal?: AbortSignal
): Promise<ProjectEngineersResponse> {
  return await apiFetch<ProjectEngineersResponse>(
    `v2/user/project-engineers-by-project-head?projectHeadId=${projectHeadId}`,
    {
      method: 'GET',
      signal,
    }
  );
}
