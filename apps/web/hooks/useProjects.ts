'use client';

import * as React from 'react';
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database, Json } from '@kkm/db';
import { UserRoleType } from '@/app/(app)/user/types';
import type { ProjectMeta } from '@/types/projects';
import { buildProjectMetaPatch } from '@/lib/projects/project-meta';
import {
  createProjectWithRelations,
  parseProjectMeta,
  updateProjectWithRelations,
  type CreateProjectPersistInput,
  type ProjectMemberSelection,
  type UpdateProjectPersistInput,
} from '@/lib/projects/persist-project';

type ProjectsTable = Database['public']['Tables']['projects'];

export type ProjectsRow = ProjectsTable['Row'];
export type ProjectsInsert = ProjectsTable['Insert'];
export type ProjectsUpdate = ProjectsTable['Update'];

export type ProjectsListRpcRow =
  Database['public']['Functions']['list_projects']['Returns'][number];

export type ProjectsListRow = ProjectsListRpcRow;

export type ProjectScheduleDetail = {
  id: string;
  schedule_source_id: string;
  is_default: boolean;
  is_active: boolean;
  schedule_sources: {
    id: string;
    display_name: string | null;
    name: string | null;
  } | null;
};

export type ProjectMemberDetail = {
  user_id: string;
  role_id: string;
  role_slug: string | null;
};

export type ProjectDetailMember = {
  role: UserRoleType;
  user_id: string;
  display_name: string;
};

export type ProjectDetail = ProjectsRow & {
  project_schedules: ProjectScheduleDetail[];
  project_members: ProjectMemberDetail[];
  members_detail: ProjectDetailMember[];
  default_schedule_source_id: string | null;
  default_schedule_display_name: string | null;
};

export const PROJECTS_QUERY_KEY = 'projects';

export const PROJECTS_TABLE_ID = PROJECTS_QUERY_KEY;

export type ProjectsListParams = {
  search?: string;
  status?: string[] | null;
  dosFrom?: string | null;
  dosTo?: string | null;
  docFrom?: string | null;
  docTo?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
};

function getSupabase() {
  return createSupabaseBrowserClient();
}

function toYmd(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim().length > 0) return v.slice(0, 10);
  return null;
}

function sortColumnToRpc(sortId: string): string {
  const m: Record<string, string> = {
    sanctionAmount: 'sanctionamount',
    sanctionDos: 'sanctiondos',
    sanctionDoc: 'sanctiondoc',
    projectLocation: 'projectlocation',
  };
  return m[sortId] ?? sortId;
}

export function buildProjectsListParamsFromFilters(
  filters: Filter[]
): Pick<
  ProjectsListParams,
  | 'status'
  | 'dosFrom'
  | 'dosTo'
  | 'docFrom'
  | 'docTo'
  | 'amountMin'
  | 'amountMax'
> {
  const out: Pick<
    ProjectsListParams,
    | 'status'
    | 'dosFrom'
    | 'dosTo'
    | 'docFrom'
    | 'docTo'
    | 'amountMin'
    | 'amountMax'
  > = {};

  for (const f of filters) {
    if (f.field === 'status' && f.values.length > 0) {
      out.status = f.values.map(String);
    }
    if (f.field === 'dosRange' && f.values.length >= 2) {
      out.dosFrom = toYmd(f.values[0]);
      out.dosTo = toYmd(f.values[1]);
    }
    if (f.field === 'docRange' && f.values.length >= 2) {
      out.docFrom = toYmd(f.values[0]);
      out.docTo = toYmd(f.values[1]);
    }
    if (f.field === 'amount' && f.values.length >= 2) {
      const a = Number(f.values[0]);
      const b = Number(f.values[1]);
      if (!Number.isNaN(a)) out.amountMin = a;
      if (!Number.isNaN(b)) out.amountMax = b;
    }
  }
  return out;
}

export async function fetchProjects(
  params: ProjectsListParams
): Promise<PaginationResponse<ProjectsListRow>> {
  const supabase = getSupabase();
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * pageSize;

  const sortCol = sortColumnToRpc(params.sortBy ?? 'created_at');
  const sortDir = params.order === 'asc' ? 'asc' : 'desc';

  const { data, error } = await supabase.rpc(
    'list_projects',
    {
      p_search: params.search?.trim() || null,
      p_status: params.status?.length ? params.status : null,
      p_dos_from: params.dosFrom ?? null,
      p_dos_to: params.dosTo ?? null,
      p_doc_from: params.docFrom ?? null,
      p_doc_to: params.docTo ?? null,
      p_amount_min: params.amountMin ?? null,
      p_amount_max: params.amountMax ?? null,
      p_sort_by: sortCol,
      p_sort_dir: sortDir,
      p_limit: pageSize,
      p_offset: offset,
    },
    params.signal ? { signal: params.signal } : undefined
  );
  if (error) throw error;

  const rows = (data ?? []) as ProjectsListRow[];
  const totalCount = Number(rows[0]?.total_count ?? 0);

  return {
    data: rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    hasPrevious: page > 1,
    hasNext: offset + rows.length < totalCount,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

export function invalidateProjectsQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
}

export function useProjectsQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ProjectsListParams = React.useMemo(() => {
    const fromFilters = buildProjectsListParamsFromFilters(params.filters);
    const out: ProjectsListParams = {
      search: params.search,
      ...fromFilters,
    };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: [PROJECTS_QUERY_KEY, listParams],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchProjects({
        ...listParams,
        page: pageParam as number,
        pageSize: 20,
        signal,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
  };
}

const SLUG_TO_MEMBER_ROLE: Record<string, UserRoleType> = {
  maker: UserRoleType.Maker,
  checker: UserRoleType.Checker,
  verifier: UserRoleType.Verifier,
  project_head: UserRoleType.ProjectHead,
  engineer: UserRoleType.Engineer,
  supervisor: UserRoleType.Superviser,
  superviser: UserRoleType.Superviser,
};

function emptyMemberSelection(): ProjectMemberSelection {
  return {
    [UserRoleType.Maker]: '',
    [UserRoleType.Checker]: '',
    [UserRoleType.Verifier]: '',
    [UserRoleType.ProjectHead]: '',
    [UserRoleType.Engineer]: '',
    [UserRoleType.Superviser]: '',
  };
}

export function projectMembersToSelection(
  members: ProjectMemberDetail[]
): ProjectMemberSelection {
  const sel = emptyMemberSelection();
  for (const m of members) {
    const slug = (m.role_slug ?? '').toLowerCase();
    const role = SLUG_TO_MEMBER_ROLE[slug];
    if (role) sel[role] = m.user_id;
  }
  return sel;
}

export function projectDetailToListRow(p: ProjectDetail): ProjectsListRow {
  return {
    id: p.id,
    tenant_id: p.tenant_id,
    name: p.name,
    code: p.code ?? '',
    status: p.status,
    meta: p.meta,
    created_at: p.created_at,
    updated_at: p.updated_at,
    total_count: 0,
    default_schedule_source_id: p.default_schedule_source_id ?? '',
    default_schedule_display_name: p.default_schedule_display_name ?? '',
  };
}

export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const supabase = getSupabase();

  const { data: project, error: pe } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (pe) throw pe;
  if (!project) throw new Error('Project not found');

  const { data: schedules, error: se } = await supabase
    .from('project_schedules')
    .select(
      `
      id,
      schedule_source_id,
      is_default,
      is_active,
      schedule_sources ( id, display_name, name )
    `
    )
    .eq('project_id', projectId);
  if (se) throw se;

  const schedRows = (schedules ?? []) as ProjectScheduleDetail[];

  const { data: members, error: me } = await supabase
    .from('project_members')
    .select('user_id, role_id')
    .eq('project_id', projectId);
  if (me) throw me;

  const roleIds = [...new Set((members ?? []).map((m: { role_id: string }) => m.role_id))];
  const { data: roleRows } = await supabase
    .schema('authz')
    .from('roles')
    .select('id, slug')
    .in('id', roleIds);

  const roleSlugById = new Map<string, string | null>(
    (roleRows ?? []).map((r: { id: string; slug: string | null }) => [
      r.id,
      r.slug,
    ])
  );

  const memberDetails: ProjectMemberDetail[] = (members ?? []).map(
    (row: { user_id: string; role_id: string }) => ({
    user_id: row.user_id,
    role_id: row.role_id,
      role_slug: roleSlugById.get(row.role_id) ?? null,
    })
  );

  const userIds = [...new Set(memberDetails.map((m: ProjectMemberDetail) => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  const nameByUser = new Map<string, string>(
    (profiles ?? []).map((p: { id: string; display_name: string | null }) => [
      p.id,
      p.display_name?.trim() || '—',
    ])
  );

  const members_detail: ProjectDetailMember[] = [];
  for (const m of memberDetails) {
    const slug = (m.role_slug ?? '').toLowerCase();
    const role = SLUG_TO_MEMBER_ROLE[slug];
    if (!role) continue;
    members_detail.push({
      role,
      user_id: m.user_id,
      display_name: nameByUser.get(m.user_id) ?? '—',
    });
  }

  const defaultSched = schedRows.find(
    (s: ProjectScheduleDetail) => s.is_default && s.is_active
  );
  const default_schedule_source_id = defaultSched?.schedule_source_id ?? null;
  const default_schedule_display_name =
    defaultSched?.schedule_sources?.display_name ??
    defaultSched?.schedule_sources?.name ??
    null;

  return {
    ...project,
    project_schedules: schedRows,
    project_members: memberDetails,
    members_detail,
    default_schedule_source_id,
    default_schedule_display_name,
  };
}

async function createProjectApi(
  input: CreateProjectPersistInput
): Promise<void> {
  const supabase = getSupabase();
  await createProjectWithRelations(supabase, input);
}

export type UpdateProjectApiInput = UpdateProjectPersistInput;

async function updateProjectApi(input: UpdateProjectApiInput): Promise<void> {
  const supabase = getSupabase();
  await updateProjectWithRelations(supabase, input);
}

async function deleteProjectApi(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project created.'),
    onSettled: () => invalidateProjectsQueries(queryClient),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProjectApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project updated.'),
    onSettled: (_data, _err, variables) => {
      invalidateProjectsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete project.', { duration: Infinity }),
    onSuccess: () => toast.success('Project deleted.'),
    onSettled: () => invalidateProjectsQueries(queryClient),
  });
}

export type CreateProjectApiInput = CreateProjectPersistInput;

export { parseProjectMeta };

export function mergeMetaForUpdate(
  baseMeta: Json | null,
  partial: ProjectMeta
): Json {
  return buildProjectMetaPatch(baseMeta, partial) as Json;
}
