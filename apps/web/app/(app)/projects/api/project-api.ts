import type { SupabaseClient } from '@supabase/supabase-js';

import type { Filter } from '@/components/ui/filters';
import type { Database, Json } from '@kkm/db';
import type { PaginationResponse } from '@/types/common';
import type { ProjectMeta } from '@/types/projects';
import { normalizeError } from '@/lib/supabase/errors';
import {
  buildProjectMetaPatch,
  parseProjectMeta,
} from '@/lib/projects/project-meta';
import {
  isProjectMemberRoleSlug,
  PROJECT_MEMBER_ROLE_SLUGS,
  type ProjectMemberRoleSlug,
} from '@/hooks/projects/use-project-member';
import {
  createProjectWithRelations,
  updateProjectWithRelations,
  PROJECTS_ROW_SELECT,
  type CreateProjectPersistInput,
  type ProjectMemberSelection,
  type UpdateProjectPersistInput,
} from '@/lib/projects/persist-project';

type ProjectsTable = Database['public']['Tables']['projects'];

type ProjectsRow = ProjectsTable['Row'];
type ProjectsInsert = ProjectsTable['Insert'];
type ProjectsUpdate = ProjectsTable['Update'];

export type ListProjectsRpcArgs =
  Database['public']['Functions']['list_projects']['Args'];

export type ProjectsListRow =
  Database['public']['Functions']['list_projects']['Returns'][number];

/** @deprecated Use `ProjectsListRow`; kept for older import sites. */
export type ProjectsListRpcRow = ProjectsListRow;

/** Partial RPC args for `list_projects` (query key + client calls). Paging uses `p_limit` / `p_offset`. */
export type ProjectsListParams = Partial<ListProjectsRpcArgs>;

type ProjectScheduleDetail = {
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

type ProjectMemberDetail = {
  user_id: string;
  role_id: string;
  role_slug: string | null;
};

type ProjectDetailMember = {
  role: ProjectMemberRoleSlug;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
};

type ProjectDetail = ProjectsRow & {
  client_display_name: string;
  project_schedules: ProjectScheduleDetail[];
  project_members: ProjectMemberDetail[];
  members_detail: ProjectDetailMember[];
  default_schedule_source_id: string | null;
  default_schedule_display_name: string | null;
};

type CreateProjectApiInput = CreateProjectPersistInput;
type UpdateProjectApiInput = UpdateProjectPersistInput;

const PROJECTS_QUERY_KEY = 'projects' as const;

function toYmd(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim().length > 0) return v.slice(0, 10);
  return null;
}

function sortColumnToRpc(sortId: string): string {
  const map: Record<string, string> = {
    sanctionAmount: 'sanctionamount',
    sanctionDos: 'sanctiondos',
    sanctionDoc: 'sanctiondoc',
    projectLocation: 'projectlocation',
  };
  return map[sortId] ?? sortId;
}

function buildProjectsListFilterRpcArgs(
  filters: Filter[]
): Partial<ListProjectsRpcArgs> {
  const out: Partial<ListProjectsRpcArgs> = {};

  for (const filter of filters) {
    if (filter.field === 'status' && filter.values.length > 0) {
      out.p_status = filter.values.map(String);
    }
    if (filter.field === 'dosRange' && filter.values.length >= 2) {
      const from = toYmd(filter.values[0]);
      const to = toYmd(filter.values[1]);
      if (from != null) {
        out.p_dos_from = from;
      }
      if (to != null) {
        out.p_dos_to = to;
      }
    }
    if (filter.field === 'docRange' && filter.values.length >= 2) {
      const from = toYmd(filter.values[0]);
      const to = toYmd(filter.values[1]);
      if (from != null) {
        out.p_doc_from = from;
      }
      if (to != null) {
        out.p_doc_to = to;
      }
    }
    if (filter.field === 'amount' && filter.values.length >= 2) {
      const min = Number(filter.values[0]);
      const max = Number(filter.values[1]);
      if (!Number.isNaN(min)) {
        out.p_amount_min = min;
      }
      if (!Number.isNaN(max)) {
        out.p_amount_max = max;
      }
    }
  }

  return out;
}

function emptyMemberSelection(): ProjectMemberSelection {
  const selection = {} as ProjectMemberSelection;
  for (const slug of PROJECT_MEMBER_ROLE_SLUGS) {
    selection[slug] = '';
  }
  return selection;
}

function applyAbortSignal<T extends { abortSignal: (signal: AbortSignal) => T }>(
  query: T,
  signal?: AbortSignal
): T {
  return signal ? query.abortSignal(signal) : query;
}

async function fetchProjects(
  supabase: SupabaseClient<Database>,
  params: ProjectsListParams,
  signal?: AbortSignal
): Promise<PaginationResponse<ProjectsListRow>> {
  const pageSize = Math.max(1, params.p_limit ?? 20);
  const offset = params.p_offset ?? 0;
  const page = Math.max(1, Math.floor(offset / pageSize) + 1);

  const sortBy = params.p_sort_by ?? 'created_at';
  const sortCol = sortColumnToRpc(sortBy);
  const sortDir = params.p_sort_dir === 'asc' ? 'asc' : 'desc';

  const rpc = applyAbortSignal(
    supabase.rpc('list_projects', {
      p_search: params.p_search?.trim() || undefined,
      p_status: params.p_status?.length ? params.p_status : undefined,
      p_dos_from: params.p_dos_from,
      p_dos_to: params.p_dos_to,
      p_doc_from: params.p_doc_from,
      p_doc_to: params.p_doc_to,
      p_amount_min: params.p_amount_min,
      p_amount_max: params.p_amount_max,
      p_sort_by: sortCol,
      p_sort_dir: sortDir,
      p_limit: pageSize,
      p_offset: offset,
    }),
    signal
  );

  const { data, error } = await rpc;
  if (error) {
    throw normalizeError(error);
  }

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

function projectMembersToSelection(
  members: ProjectMemberDetail[]
): ProjectMemberSelection {
  const selection = emptyMemberSelection();
  for (const member of members) {
    const slug = (member.role_slug ?? '').toLowerCase();
    if (isProjectMemberRoleSlug(slug)) {
      selection[slug] = member.user_id;
    }
  }
  return selection;
}

function projectDetailToListRow(project: ProjectDetail): ProjectsListRow {
  return {
    id: project.id,
    tenant_id: project.tenant_id,
    name: project.name,
    code: project.code ?? '',
    status: project.status,
    meta: project.meta,
    created_at: project.created_at,
    updated_at: project.updated_at,
    total_count: 0,
    client_id: project.client_id ?? '',
    client_display_name: project.client_display_name,
    default_schedule_source_id: project.default_schedule_source_id ?? '',
    default_schedule_display_name: project.default_schedule_display_name ?? '',
  };
}

async function fetchProjectDetail(
  supabase: SupabaseClient<Database>,
  projectId: string,
  signal?: AbortSignal
): Promise<ProjectDetail> {
  let projectQuery = supabase
    .from('projects')
    .select(PROJECTS_ROW_SELECT)
    .eq('id', projectId);
  if (signal) {
    projectQuery = projectQuery.abortSignal(signal);
  }
  const projectDetailQuery = projectQuery.single();
  const { data: project, error: projectError } = await projectDetailQuery;
  if (projectError) {
    throw normalizeError(projectError);
  }
  if (!project) {
    throw new Error('Project not found');
  }

  const scheduleQuery = applyAbortSignal(
    supabase
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
      .eq('project_id', projectId),
    signal
  );
  const { data: schedules, error: scheduleError } = await scheduleQuery;
  if (scheduleError) {
    throw normalizeError(scheduleError);
  }

  const projectSchedules = (schedules ?? []) as ProjectScheduleDetail[];

  const memberQuery = applyAbortSignal(
    supabase
      .from('project_members')
      .select('user_id, role_id')
      .eq('project_id', projectId),
    signal
  );
  const { data: members, error: memberError } = await memberQuery;
  if (memberError) {
    throw normalizeError(memberError);
  }

  const roleIds = [...new Set((members ?? []).map((member) => member.role_id))];
  let roleRows: Array<{ id: string; slug: string | null }> = [];
  if (roleIds.length > 0) {
    const roleQuery = applyAbortSignal(
      supabase
        .schema('authz')
        .from('tenant_roles')
        .select('id, slug')
        .in('id', roleIds),
      signal
    );
    const { data, error } = await roleQuery;
    if (error) {
      throw normalizeError(error);
    }
    roleRows = (data ?? []) as Array<{ id: string; slug: string | null }>;
  }

  const roleSlugById = new Map<string, string | null>(
    roleRows.map((row) => [row.id, row.slug])
  );

  const memberDetails: ProjectMemberDetail[] = (members ?? []).map((member) => ({
    user_id: member.user_id,
    role_id: member.role_id,
    role_slug: roleSlugById.get(member.role_id) ?? null,
  }));

  const userIds = [...new Set(memberDetails.map((member) => member.user_id))];
  type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  let profiles: ProfileRow[] = [];
  if (userIds.length > 0) {
    const profileQuery = applyAbortSignal(
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds),
      signal
    );
    const { data, error } = await profileQuery;
    if (error) {
      throw normalizeError(error);
    }
    profiles = (data ?? []) as ProfileRow[];
  }

  const nameByUser = new Map<string, string>(
    profiles.map((profile) => [
      profile.id,
      profile.display_name?.trim() || '—',
    ])
  );
  const avatarByUser = new Map<string, string | null>(
    profiles.map((profile) => [profile.id, profile.avatar_url])
  );

  const membersDetail: ProjectDetailMember[] = [];
  for (const member of memberDetails) {
    const slug = (member.role_slug ?? '').toLowerCase();
    if (!isProjectMemberRoleSlug(slug)) {
      continue;
    }
    membersDetail.push({
      role: slug,
      user_id: member.user_id,
      display_name: nameByUser.get(member.user_id) ?? '—',
      avatar_url: avatarByUser.get(member.user_id) ?? null,
    });
  }

  const defaultSchedule = projectSchedules.find(
    (schedule) => schedule.is_default && schedule.is_active
  );
  const defaultScheduleSourceId = defaultSchedule?.schedule_source_id ?? null;
  const defaultScheduleDisplayName =
    defaultSchedule?.schedule_sources?.display_name ??
    defaultSchedule?.schedule_sources?.name ??
    null;

  let clientDisplayName = '';
  if (project.client_id) {
    let clientQuery = supabase
      .from('clients')
      .select('display_name')
      .eq('id', project.client_id);
    if (signal) {
      clientQuery = clientQuery.abortSignal(signal);
    }
    const { data, error } = await clientQuery.maybeSingle();
    if (error) {
      throw normalizeError(error);
    }
    clientDisplayName = data?.display_name?.trim() ?? '';
  }

  return {
    ...project,
    client_display_name: clientDisplayName,
    project_schedules: projectSchedules,
    project_members: memberDetails,
    members_detail: membersDetail,
    default_schedule_source_id: defaultScheduleSourceId,
    default_schedule_display_name: defaultScheduleDisplayName,
  };
}

async function createProject(
  supabase: SupabaseClient<Database>,
  input: CreateProjectApiInput
): Promise<void> {
  try {
    await createProjectWithRelations(supabase, input);
  } catch (error) {
    throw normalizeError(error);
  }
}

async function updateProject(
  supabase: SupabaseClient<Database>,
  input: UpdateProjectApiInput
): Promise<void> {
  try {
    await updateProjectWithRelations(supabase, input);
  } catch (error) {
    throw normalizeError(error);
  }
}

async function deleteProject(
  supabase: SupabaseClient<Database>,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  const deleteQuery = applyAbortSignal(
    supabase.from('projects').delete().eq('id', id),
    signal
  );
  const { error } = await deleteQuery;
  if (error) {
    throw normalizeError(error);
  }
}

function mergeMetaForUpdate(baseMeta: Json | null, partial: ProjectMeta): Json {
  return buildProjectMetaPatch(baseMeta, partial) as Json;
}

export {
  PROJECTS_QUERY_KEY,
  buildProjectsListFilterRpcArgs,
  createProject,
  deleteProject,
  fetchProjectDetail,
  fetchProjects,
  mergeMetaForUpdate,
  parseProjectMeta,
  projectDetailToListRow,
  projectMembersToSelection,
  updateProject,
};

export type {
  CreateProjectApiInput,
  ProjectDetail,
  ProjectDetailMember,
  ProjectMemberDetail,
  ProjectScheduleDetail,
  ProjectsInsert,
  ProjectsRow,
  ProjectsUpdate,
  UpdateProjectApiInput,
};
