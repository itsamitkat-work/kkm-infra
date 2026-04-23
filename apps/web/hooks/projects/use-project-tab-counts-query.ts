'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProjectBoqDomainLinesType } from '@/app/projects/[id]/estimation/types';

export type ProjectTabCounts = {
  plannedBoqLines: number;
  estimationLines: number;
  measurementLines: number;
  billingLines: number;
};

export const PROJECT_TAB_COUNTS_ROOT_QUERY_KEY = 'project-tab-counts' as const;

export function projectTabCountsQueryKey(projectId: string) {
  return [PROJECT_TAB_COUNTS_ROOT_QUERY_KEY, projectId] as const;
}

async function countBoqLinesByType(
  projectId: string,
  projectBoqLinesType: 'planned',
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('project_boq_lines_type', projectBoqLinesType);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { count, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

/** Same rows as `fetchAllProjectBoqLines(projectId, domain)` — baseline + that sheet's supplementary lines. */
async function countBoqLinesForDomainTab(
  projectId: string,
  domain: ProjectBoqDomainLinesType,
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .or(`project_boq_lines_type.eq.planned,project_boq_lines_type.eq.${domain}`);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { count, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function fetchProjectTabCounts(
  projectId: string,
  signal?: AbortSignal
): Promise<ProjectTabCounts> {
  const [
    plannedBoqLines,
    estimationLines,
    measurementLines,
    billingLines,
  ] = await Promise.all([
    countBoqLinesByType(projectId, 'planned', signal),
    countBoqLinesForDomainTab(projectId, 'estimation', signal),
    countBoqLinesForDomainTab(projectId, 'measurement', signal),
    countBoqLinesForDomainTab(projectId, 'billing', signal),
  ]);

  return {
    plannedBoqLines,
    estimationLines,
    measurementLines,
    billingLines,
  };
}

export function invalidateProjectTabCounts(
  queryClient: QueryClient,
  projectId?: string
) {
  if (projectId) {
    void queryClient.invalidateQueries({
      queryKey: projectTabCountsQueryKey(projectId),
    });
    return;
  }
  void queryClient.invalidateQueries({
    queryKey: [PROJECT_TAB_COUNTS_ROOT_QUERY_KEY],
  });
}

export function useProjectTabCountsQuery({
  projectId,
  enabled = true,
}: {
  projectId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: projectTabCountsQueryKey(projectId),
    queryFn: ({ signal }) => fetchProjectTabCounts(projectId, signal),
    enabled: !!projectId && enabled,
    staleTime: 30_000,
  });
}
