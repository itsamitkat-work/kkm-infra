import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { AccessTokenClaims } from '@/types/jwt-claims';
import type { AppAction, AppSubject } from '@/lib/authz/app-subjects';
import {
  ASSIGNED_PROJECTS_READ,
  ATTENDANCE_CHECK,
  ATTENDANCE_LOCK,
  ATTENDANCE_READ,
  ATTENDANCE_VERIFY,
  BASIC_RATES_MANAGE,
  BASIC_RATES_READ,
  PROJECTS_CREATE,
  PROJECTS_DELETE,
  PROJECTS_READ,
  PROJECTS_UPDATE,
  PROJECT_BILLING_CHECK,
  PROJECT_BILLING_VERIFY,
  PROJECT_MEASUREMENT_CHECK,
  PROJECT_MEASUREMENT_VERIFY,
  RESOURCE_POOL_READ,
  RESOURCE_POOL_UPDATE,
  SCHEDULES_MANAGE,
  SCHEDULES_READ,
} from '@/lib/authz-permission-keys';

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

const PERMISSION_RULES: ReadonlyArray<
  readonly [key: string, action: AppAction, subject: AppSubject]
> = [
  [SCHEDULES_READ, 'read', 'Schedule'],
  [SCHEDULES_MANAGE, 'manage', 'Schedule'],
  [BASIC_RATES_READ, 'read', 'BasicRate'],
  [BASIC_RATES_MANAGE, 'manage', 'BasicRate'],
  [ATTENDANCE_READ, 'read', 'Attendance'],
  [ATTENDANCE_CHECK, 'check', 'Attendance'],
  [ATTENDANCE_VERIFY, 'verify', 'Attendance'],
  [ATTENDANCE_LOCK, 'lock', 'Attendance'],
  [RESOURCE_POOL_READ, 'read', 'ResourcePool'],
  [RESOURCE_POOL_UPDATE, 'update', 'ResourcePool'],
  [PROJECTS_READ, 'read', 'Project'],
  [PROJECTS_UPDATE, 'update', 'Project'],
  [PROJECTS_DELETE, 'delete', 'Project'],
  [PROJECTS_CREATE, 'create', 'Project'],
  [ASSIGNED_PROJECTS_READ, 'read', 'AssignedProject'],
  [PROJECT_MEASUREMENT_CHECK, 'check', 'ProjectMeasurement'],
  [PROJECT_MEASUREMENT_VERIFY, 'verify', 'ProjectMeasurement'],
  [PROJECT_BILLING_CHECK, 'check', 'ProjectBilling'],
  [PROJECT_BILLING_VERIFY, 'verify', 'ProjectBilling'],
];

export function defineAbilityFor(input: {
  permissions: readonly string[];
  claims: AccessTokenClaims | null;
}): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (input.claims?.is_system_admin) {
    for (const [, action, subject] of PERMISSION_RULES) {
      can(action, subject);
    }
  } else {
    const granted = new Set(input.permissions);
    for (const [key, action, subject] of PERMISSION_RULES) {
      if (granted.has(key)) {
        can(action, subject);
      }
    }
  }

  return build();
}
