import type { Database } from '@kkm/db';

type TenantRoleSlug = Database['authz']['Tables']['tenant_roles']['Row']['slug'];

export const PROJECT_MEMBER_ROLE_SLUGS = [
  'project_maker',
  'project_checker',
  'project_verifier',
  'project_head',
  'project_engineer',
  'project_supervisor',
] as const satisfies readonly TenantRoleSlug[];

export type ProjectMemberRoleSlug =
  (typeof PROJECT_MEMBER_ROLE_SLUGS)[number];

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
