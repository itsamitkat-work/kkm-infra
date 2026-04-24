import type { Database, Json } from '@kkm/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PROJECT_MEMBER_ROLE_ORDER,
  PROJECT_MEMBER_ROLE_SLUGS,
  type ProjectMemberRoleSlug,
} from '@/hooks/projects/use-project-member';
import {
  buildProjectMetaPatch,
  parseProjectMeta,
} from '@/lib/projects/project-meta';
import type { ProjectMeta } from '@/types/projects';

type ProjectsRow = Database['public']['Tables']['projects']['Row'];

/** PostgREST `projects` row fragment — explicit columns instead of `select=*`. */
export const PROJECTS_ROW_SELECT =
  'id, tenant_id, name, code, status, meta, created_at, updated_at, client_id' as const;

export type ProjectMemberSelection = Record<ProjectMemberRoleSlug, string>;

export type ProjectScheduleCreateRow = {
  schedule_source_id: string;
  is_default: boolean;
};

export type CreateProjectPersistInput = {
  name: string;
  code: string | null;
  status: string;
  meta: ProjectMeta;
  schedule_source_id?: string;
  /** When creating with multiple client schedules, extras are inserted after RPC. */
  additional_schedule_source_ids?: string[];
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
    .from('tenant_roles')
    .select('id, slug')
    .eq('tenant_id', tenantId);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.slug) map.set(row.slug, row.id);
  }
  return map;
}

function resolveRoleId(
  map: Map<string, string>,
  slug: ProjectMemberRoleSlug
): string {
  const id = map.get(slug);
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

  for (const slug of PROJECT_MEMBER_ROLE_ORDER) {
    const userId = members[slug];
    if (!userId) continue;
    inserts.push({
      project_id: projectId,
      user_id: userId,
      role_id: resolveRoleId(roleMap, slug),
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
    const { error: insertError } = await supabase
      .from('project_schedules')
      .insert({
        project_id: projectId,
        schedule_source_id: scheduleSourceId,
        is_default: false,
        is_active: true,
      });
    if (insertError) throw insertError;
  }

  const { error: rpcError } = await supabase.rpc(
    'set_default_project_schedule',
    {
      p_project_id: projectId,
      p_schedule_source_id: scheduleSourceId,
    }
  );
  if (rpcError) throw rpcError;
}

export async function createProjectWithRelations(
  supabase: SupabaseClient<Database>,
  input: CreateProjectPersistInput
): Promise<ProjectsRow> {
  const metaJson = buildProjectMetaPatch({}, input.meta) as Json;

  const membersBySlug: Record<string, string> = {};
  for (const slug of PROJECT_MEMBER_ROLE_ORDER) {
    const userId = input.members[slug];
    if (!userId) {
      continue;
    }
    membersBySlug[slug] = userId;
  }

  const rpcPayload: Database['public']['Functions']['create_project_with_relations']['Args'] =
    {
      p_name: input.name,
      p_code: input.code ?? '',
      p_status: input.status,
      p_meta: metaJson,
      p_members_by_slug: membersBySlug,
    };
  if (input.schedule_source_id) {
    rpcPayload.p_schedule_source_id = input.schedule_source_id;
  }

  const clientIdFromMeta =
    input.meta &&
    typeof input.meta.client_id === 'string' &&
    input.meta.client_id.trim().length > 0
      ? input.meta.client_id.trim()
      : '';
  if (clientIdFromMeta) {
    rpcPayload.p_client_id = clientIdFromMeta;
  }

  const { data: project, error: projectError } = await supabase.rpc(
    'create_project_with_relations',
    rpcPayload
  );
  if (projectError) {
    throw projectError;
  }
  if (!project) {
    throw new Error('Project create returned no row');
  }

  const extras = input.additional_schedule_source_ids ?? [];
  if (extras.length > 0 && input.schedule_source_id) {
    for (const sid of extras) {
      if (!sid || sid === input.schedule_source_id) {
        continue;
      }
      const { data: existing, error: findError } = await supabase
        .from('project_schedules')
        .select('id')
        .eq('project_id', project.id)
        .eq('schedule_source_id', sid)
        .maybeSingle();
      if (findError) {
        throw findError;
      }
      if (!existing) {
        const { error: insertError } = await supabase
          .from('project_schedules')
          .insert({
            project_id: project.id,
            schedule_source_id: sid,
            is_default: false,
            is_active: true,
          });
        if (insertError) {
          throw insertError;
        }
      }
    }
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
    await ensureDefaultSchedule(
      supabase,
      input.projectId,
      input.schedule_source_id
    );
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
  for (const k of PROJECT_MEMBER_ROLE_SLUGS) {
    if ((a[k] || '') !== (b[k] || '')) return false;
  }
  return true;
}

export { parseProjectMeta };
