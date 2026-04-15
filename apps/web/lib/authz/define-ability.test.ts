import { describe, expect, it } from 'vitest';
import { defineAbilityFor } from '@/lib/authz/define-ability';
import {
  ATTENDANCE_CHECK,
  SCHEDULES_MANAGE,
  SCHEDULES_READ,
} from '@/lib/authz-permission-keys';

describe('defineAbilityFor', () => {
  it('maps schedules.read to read Schedule', () => {
    const ability = defineAbilityFor({
      permissions: [SCHEDULES_READ],
      claims: null,
    });
    expect(ability.can('read', 'Schedule')).toBe(true);
    expect(ability.can('manage', 'Schedule')).toBe(false);
  });

  it('maps schedules.manage to manage Schedule', () => {
    const ability = defineAbilityFor({
      permissions: [SCHEDULES_MANAGE],
      claims: null,
    });
    expect(ability.can('manage', 'Schedule')).toBe(true);
  });

  it('grants every permission rule when is_system_admin', () => {
    const ability = defineAbilityFor({
      permissions: [],
      claims: { is_system_admin: true },
    });
    expect(ability.can('manage', 'Schedule')).toBe(true);
    expect(ability.can('read', 'Schedule')).toBe(true);
    expect(ability.can('lock', 'Attendance')).toBe(true);
    expect(ability.can('manage', 'BasicRate')).toBe(true);
  });

  it('maps attendance.check to check Attendance', () => {
    const ability = defineAbilityFor({
      permissions: [ATTENDANCE_CHECK],
      claims: null,
    });
    expect(ability.can('check', 'Attendance')).toBe(true);
    expect(ability.can('read', 'Attendance')).toBe(false);
  });
});
