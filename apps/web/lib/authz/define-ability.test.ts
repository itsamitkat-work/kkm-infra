import { describe, expect, it } from 'vitest';
import { defineAbilityFor } from '@/lib/authz/define-ability';

describe('defineAbilityFor', () => {
  it('maps schedules.read to read schedules', () => {
    const ability = defineAbilityFor({
      permissions: ['schedules.read'],
      claims: null,
    });
    expect(ability.can('read', 'schedules')).toBe(true);
    expect(ability.can('manage', 'schedules')).toBe(false);
  });

  it('maps schedules.manage to manage schedules', () => {
    const ability = defineAbilityFor({
      permissions: ['schedules.manage'],
      claims: null,
    });
    expect(ability.can('manage', 'schedules')).toBe(true);
  });

  it('grants every permission rule when is_system_admin', () => {
    const ability = defineAbilityFor({
      permissions: [],
      claims: { is_system_admin: true },
    });
    expect(ability.can('manage', 'schedules')).toBe(true);
    expect(ability.can('read', 'schedules')).toBe(true);
    expect(ability.can('lock', 'attendance')).toBe(true);
    expect(ability.can('manage', 'basic_rates')).toBe(true);
  });

  it('maps attendance.check to check attendance', () => {
    const ability = defineAbilityFor({
      permissions: ['attendance.check'],
      claims: null,
    });
    expect(ability.can('check', 'attendance')).toBe(true);
    expect(ability.can('read', 'attendance')).toBe(false);
  });
});
