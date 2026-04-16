import type { Database, Json } from '@kkm/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UserRoleType } from '@/app/(app)/user/types';
import { buildProjectMetaPatch, parseProjectMeta } from '@/lib/projects/project-meta';
import type { ProjectMeta } from '@/types/projects';

type ProjectsRow = Database['public']['Tables']['projects']['Row'];

const USER_ROLE_SLUG: Record<UserRoleType, string> = {
  [UserRoleType.Maker]: 'maker',
  [UserRoleType.Checker]: 'checker',
  [UserRoleType.Verifier]: 'verifier',
  [UserRoleType.ProjectHead]: 'project_head',
  [UserRoleType.Engineer]: 'engineer',
  [UserRoleType.Superviser]: 'supervisor',
};

export type ProjectMemberSelection = Record<UserRoleType, string>;

export type CreateProjectPersistInput = {
  name: string;
  code: string | null;
  status: string;
  meta: ProjectMeta;
  schedule_source_id: string;
  members: ProjectMemberSelection;
};

export type UpdateProjectPersistInput = {
  tenantId: string;
  projectId: string;
  name?: string;
  code?: string | null;
  status?: string;
  metaPatch?: ProjectMeta;
  baseMeta?: Json | null;
  schedule_source_id?: string;
  members?: ProjectMemberSelection;
};

async function fetchRoleIdsForTenant(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .schema('authz')
    .from('roles')
    .select('id, slug')
    .eq('tenant_id', tenantId);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.slug) map.set(row.slug, row.id);
  }
  return map;
}

function resolveRoleId(map: Map<string, string>, role: UserRoleType): string {
  const slug = USER_ROLE_SLUG[role];
  let id = map.get(slug);
  if (!id && role === UserRoleType.Superviser) {
    id = map.get('superviser') ?? map.get('supervisor');
  }
  if (!id) {
    throw new Error(`Missing tenant role for slug "${slug}".`);
  }
  return id;
}

async function replaceProjectMembers(
  supabase: SupabaseClient<Database>,
  projectId: string,
  tenantId: string,
  members: ProjectMemberSelection
): Promise<void> {
  const roleMap = await fetchRoleIdsForTenant(supabase, tenantId);
  const { error: delError } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId);
  if (delError) throw delError;

  const inserts: Database['public']['Tables']['project_members']['Insert'][] =
    [];

  const roles: UserRoleType[] = [
    UserRoleType.Verifier,
    UserRoleType.Checker,
    UserRoleType.Maker,
    UserRoleType.ProjectHead,
    UserRoleType.Engineer,
    UserRoleType.Superviser,
  ];

  for (const r of roles) {
    const userId = members[r];
    if (!userId) continue;
    inserts.push({
      project_id: projectId,
      user_id: userId,
      role_id: resolveRoleId(roleMap, r),
    });
  }

  if (inserts.length === 0) return;

  const { error: insError } = await supabase
    .from('project_members')
    .insert(inserts);
  if (insError) throw insError;
}

async function ensureDefaultSchedule(
  supabase: SupabaseClient<Database>,
  projectId: string,
  scheduleSourceId: string
): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from('project_schedules')
    .select('id')
    .eq('project_id', projectId)
    .eq('schedule_source_id', scheduleSourceId)
    .maybeSingle();
  if (findError) throw findError;

  if (!existing) {
    const { error: insertError } = await supabase.from('project_schedules').insert({
      project_id: projectId,
      schedule_source_id: scheduleSourceId,
      is_default: false,
      is_active: true,
    });
    if (insertError) throw insertError;
  }

  const { error: rpcError } = await supabase.rpc('set_default_project_schedule', {
    p_project_id: projectId,
    p_schedule_source_id: scheduleSourceId,
  });
  if (rpcError) throw rpcError;
}

export async function createProjectWithRelations(
  supabase: SupabaseClient<Database>,
  input: CreateProjectPersistInput
): Promise<ProjectsRow> {
  const metaJson = buildProjectMetaPatch({}, input.meta) as Json;
  const insertRow = {
    name: input.name,
    code: input.code,
    status: input.status,
    meta: metaJson,
  } as Database['public']['Tables']['projects']['Insert'];

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(insertRow)
    .select()
    .single();
  if (projectError) throw projectError;
  if (!project) throw new Error('Project create returned no row');

  try {
    await ensureDefaultSchedule(supabase, project.id, input.schedule_source_id);
    await replaceProjectMembers(
      supabase,
      project.id,
      project.tenant_id,
      input.members
    );
  } catch (e) {
    await supabase.from('projects').delete().eq('id', project.id);
    throw e;
  }

  return project;
}

export async function updateProjectWithRelations(
  supabase: SupabaseClient<Database>,
  input: UpdateProjectPersistInput
): Promise<void> {
  const patch: Database['public']['Tables']['projects']['Update'] = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code;
  if (input.status !== undefined) patch.status = input.status;

  if (input.metaPatch && Object.keys(input.metaPatch).length > 0) {
    const merged = buildProjectMetaPatch(
      input.baseMeta ?? {},
      input.metaPatch
    ) as Json;
    patch.meta = merged;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', input.projectId);
    if (error) throw error;
  }

  if (input.schedule_source_id) {
    await ensureDefaultSchedule(supabase, input.projectId, input.schedule_source_id);
  }

  if (input.members) {
    await replaceProjectMembers(
      supabase,
      input.projectId,
      input.tenantId,
      input.members
    );
  }
}

export function membersEqual(
  a: ProjectMemberSelection,
  b: ProjectMemberSelection
): boolean {
  const keys = Object.keys(USER_ROLE_SLUG) as UserRoleType[];
  for (const k of keys) {
    if ((a[k] || '') !== (b[k] || '')) return false;
  }
  return true;
}

export { parseProjectMeta, USER_ROLE_SLUG };
