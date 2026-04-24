import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability';
import type { AccessTokenClaims } from '@/types/jwt-claims';

export type AppSubject =
  | 'schedules'
  | 'basic_rates'
  | 'attendance'
  | 'resource_pool'
  | 'projects'
  | 'assigned_projects'
  | 'project_measurement'
  | 'project_billing'
  | 'clients'
  | 'tenant_members'
  | 'tenants';

export type AppAction =
  | 'read'
  | 'manage'
  | 'check'
  | 'verify'
  | 'lock'
  | 'update'
  | 'delete'
  | 'create';

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/** Permission keys in `authz.permissions` (see `supabase/seed/auth_authz_seed.sql`). */
const CATALOG_PERMISSION_RULES: ReadonlyArray<readonly [key: string, action: AppAction]> =
  [
    ['basic_rates.read', 'read'],
    ['basic_rates.manage', 'manage'],
    ['clients.read', 'read'],
    ['clients.manage', 'manage'],
    ['tenant_members.read', 'read'],
    ['tenant_members.manage', 'manage'],
    ['projects.read', 'read'],
    ['projects.manage', 'manage'],
    ['schedules.read', 'read'],
    ['schedules.manage', 'manage'],
    ['tenants.manage', 'manage'],
  ];

const ALL_APP_SUBJECTS: readonly AppSubject[] = [
  'schedules',
  'basic_rates',
  'attendance',
  'resource_pool',
  'projects',
  'assigned_projects',
  'project_measurement',
  'project_billing',
  'clients',
  'tenant_members',
  'tenants',
];

function subjectFromPermissionKey(permissionKey: string): AppSubject {
  const dot = permissionKey.lastIndexOf('.');
  const prefix = dot === -1 ? permissionKey : permissionKey.slice(0, dot);
  return prefix as AppSubject;
}

export function defineAbilityFor(input: {
  permissions: readonly string[];
  claims: AccessTokenClaims | null;
}): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (input.claims?.is_system_admin) {
    for (const subject of ALL_APP_SUBJECTS) {
      can('manage', subject);
    }
  } else {
    const granted = new Set(input.permissions);
    for (const [key, action] of CATALOG_PERMISSION_RULES) {
      if (granted.has(key)) {
        can(action, subjectFromPermissionKey(key));
      }
    }
  }

  return build();
}
