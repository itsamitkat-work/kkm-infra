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
  | 'project_billing';

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

const PERMISSION_RULES: ReadonlyArray<readonly [key: string, action: AppAction]> =
  [
    ['schedules.read', 'read'],
    ['schedules.manage', 'manage'],
    ['basic_rates.read', 'read'],
    ['basic_rates.manage', 'manage'],
    ['attendance.read', 'read'],
    ['attendance.check', 'check'],
    ['attendance.verify', 'verify'],
    ['attendance.lock', 'lock'],
    ['resource_pool.read', 'read'],
    ['resource_pool.update', 'update'],
    ['projects.read', 'read'],
    ['projects.update', 'update'],
    ['projects.delete', 'delete'],
    ['projects.create', 'create'],
    ['assigned_projects.read', 'read'],
    ['project_measurement.check', 'check'],
    ['project_measurement.verify', 'verify'],
    ['project_billing.check', 'check'],
    ['project_billing.verify', 'verify'],
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
    for (const [key, action] of PERMISSION_RULES) {
      can(action, subjectFromPermissionKey(key));
    }
  } else {
    const granted = new Set(input.permissions);
    for (const [key, action] of PERMISSION_RULES) {
      if (granted.has(key)) {
        can(action, subjectFromPermissionKey(key));
      }
    }
  }

  return build();
}
