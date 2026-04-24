'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export {
  PROJECTS_QUERY_KEY,
  mergeMetaForUpdate,
  parseProjectMeta,
  projectDetailToListRow,
  projectMembersToSelection,
  type CreateProjectApiInput,
  type ProjectDetail,
  type ProjectDetailMember,
  type ProjectMemberDetail,
  type ProjectScheduleDetail,
  type ProjectsInsert,
  type ProjectsListParams,
  type ProjectsListRow,
  type ProjectsListRpcRow,
  type ProjectsRow,
  type ProjectsUpdate,
  type UpdateProjectApiInput,
} from '@/app/(app)/projects/api/project-api';

export {
  fetchProjectDetail as fetchProjectDetailWithClient,
  fetchProjects as fetchProjectsWithClient,
} from '@/app/(app)/projects/api/project-api';

export {
  PROJECTS_QUERY_KEY_PREFIX,
  PROJECTS_TABLE_ID,
  invalidateProjectsQueryCache as invalidateProjectsQueries,
  useProjectsQuery,
} from '@/app/(app)/projects/hooks/use-projects-query';

export { buildProjectsListFilterRpcArgs } from '@/app/(app)/projects/api/project-api';

export {
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from '@/app/(app)/projects/hooks/use-projects-mutations';

import {
  fetchProjectDetail as fetchProjectDetailApi,
  fetchProjects as fetchProjectsApi,
  type ProjectDetail,
  type ProjectsListParams,
} from '@/app/(app)/projects/api/project-api';

export async function fetchProjects(
  params: ProjectsListParams & { signal?: AbortSignal }
) {
  const { signal, ...rest } = params;
  return fetchProjectsApi(createSupabaseBrowserClient(), rest, signal);
}

export async function fetchProjectDetail(
  projectId: string,
  signal?: AbortSignal
): Promise<ProjectDetail> {
  return fetchProjectDetailApi(
    createSupabaseBrowserClient(),
    projectId,
    signal
  );
}
