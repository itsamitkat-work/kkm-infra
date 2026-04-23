import * as React from 'react';
import type { Database } from '@kkm/db';

type TenantRoleSlug =
  Database['authz']['Tables']['tenant_roles']['Row']['slug'];

export const PROJECT_MEMBER_ROLE_SLUGS = [
  'project_maker',
  'project_checker',
  'project_verifier',
  'project_head',
  'project_engineer',
  'project_supervisor',
] as const satisfies readonly TenantRoleSlug[];

export type ProjectMemberRoleSlug = (typeof PROJECT_MEMBER_ROLE_SLUGS)[number];

export function isProjectMemberRoleSlug(
  value: string
): value is ProjectMemberRoleSlug {
  return (PROJECT_MEMBER_ROLE_SLUGS as readonly string[]).includes(value);
}

export const PROJECT_MEMBER_ROLE_ORDER: readonly ProjectMemberRoleSlug[] = [
  'project_verifier',
  'project_checker',
  'project_maker',
  'project_head',
  'project_engineer',
  'project_supervisor',
];

/** UI labels for each project team slot (drawer + read-only info). */
export const PROJECT_TEAM_ROLE_LABELS = {
  project_maker: 'Project Maker',
  project_checker: 'Project Checker',
  project_verifier: 'Project Verifier',
  project_head: 'Project Head',
  project_engineer: 'Project Engineer',
  project_supervisor: 'Supervisor',
} as const satisfies Record<ProjectMemberRoleSlug, string>;

/** Combobox placeholders in the project drawer. */
export const PROJECT_TEAM_ROLE_PLACEHOLDERS = {
  project_maker: 'Select project maker',
  project_checker: 'Select project checker',
  project_verifier: 'Select project verifier',
  project_head: 'Select project head',
  project_engineer: 'Select project engineer',
  project_supervisor: 'Select supervisor',
} as const satisfies Record<ProjectMemberRoleSlug, string>;

export const PROJECT_TEAM_ESTIMATION_ROLES = [
  'project_maker',
  'project_checker',
  'project_verifier',
] as const satisfies readonly ProjectMemberRoleSlug[];

export const PROJECT_TEAM_OPERATIONS_ROLES = [
  'project_head',
  'project_engineer',
  'project_supervisor',
] as const satisfies readonly ProjectMemberRoleSlug[];

export type ProjectTeamDrawerField = {
  roleSlug: ProjectMemberRoleSlug;
  label: string;
  placeholder: string;
};

function drawerFieldsForRoles(
  roles: readonly ProjectMemberRoleSlug[]
): ProjectTeamDrawerField[] {
  return roles.map((roleSlug) => ({
    roleSlug,
    label: PROJECT_TEAM_ROLE_LABELS[roleSlug],
    placeholder: PROJECT_TEAM_ROLE_PLACEHOLDERS[roleSlug],
  }));
}

export const PROJECT_TEAM_DRAWER_ESTIMATION_FIELDS = drawerFieldsForRoles(
  PROJECT_TEAM_ESTIMATION_ROLES
);

export const PROJECT_TEAM_DRAWER_OPERATIONS_FIELDS = drawerFieldsForRoles(
  PROJECT_TEAM_OPERATIONS_ROLES
);

/**
 * Index project `members_detail` rows by authz role slug for Estimation / Operations UI.
 * Generic so this module does not import `@/hooks/useProjects` (avoids circular deps with persist).
 */
export function useProjectMembersByRole<
  T extends { role: ProjectMemberRoleSlug },
>(membersDetail: T[] | null | undefined): Map<ProjectMemberRoleSlug, T> {
  return React.useMemo(() => {
    const map = new Map<ProjectMemberRoleSlug, T>();
    for (const row of membersDetail ?? []) {
      map.set(row.role, row);
    }
    return map;
  }, [membersDetail]);
}
