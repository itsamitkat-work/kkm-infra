'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

type CountTable =
  | 'project_boq_lines'
  | 'project_estimation_lines'
  | 'project_measurement_lines'
  | 'project_billing_lines';

async function countByProjectId(
  table: Exclude<CountTable, 'project_boq_lines'>,
  projectId: string,
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { count, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function countPlannedBoqLinesByProjectId(
  projectId: string,
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('project_boq_lines_type', 'planned');
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
    countPlannedBoqLinesByProjectId(projectId, signal),
    countByProjectId('project_estimation_lines', projectId, signal),
    countByProjectId('project_measurement_lines', projectId, signal),
    countByProjectId('project_billing_lines', projectId, signal),
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
