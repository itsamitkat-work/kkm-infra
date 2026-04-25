import { describe, expect, it } from 'vitest';
import { defineAbilityFor } from '@/lib/authz/define-ability';

describe('defineAbilityFor', () => {
  it('maps schedules.manage to manage schedules and implies read', () => {
    const ability = defineAbilityFor({
      permissions: ['schedules.manage'],
      claims: null,
    });
    expect(ability.can('manage', 'schedules')).toBe(true);
    expect(ability.can('read', 'schedules')).toBe(true);
  });

  it('maps schedules.read to read schedules only', () => {
    const ability = defineAbilityFor({
      permissions: ['schedules.read'],
      claims: null,
    });
    expect(ability.can('read', 'schedules')).toBe(true);
    expect(ability.can('manage', 'schedules')).toBe(false);
  });

  it('maps tenant_members.manage to manage tenant_members', () => {
    const ability = defineAbilityFor({
      permissions: ['tenant_members.manage'],
      claims: null,
    });
    expect(ability.can('manage', 'tenant_members')).toBe(true);
  });

  it('implies read on tenant_members when tenant_members.manage is granted', () => {
    const ability = defineAbilityFor({
      permissions: ['tenant_members.manage'],
      claims: null,
    });
    expect(ability.can('read', 'tenant_members')).toBe(true);
  });

  it('maps tenant_members.read to read tenant_members only', () => {
    const ability = defineAbilityFor({
      permissions: ['tenant_members.read'],
      claims: null,
    });
    expect(ability.can('read', 'tenant_members')).toBe(true);
    expect(ability.can('manage', 'tenant_members')).toBe(false);
  });

  it('maps tenant_roles.manage to manage tenant_roles and allows read via manage', () => {
    const ability = defineAbilityFor({
      permissions: ['tenant_roles.manage'],
      claims: null,
    });
    expect(ability.can('manage', 'tenant_roles')).toBe(true);
    expect(ability.can('read', 'tenant_roles')).toBe(true);
  });

  it('maps tenant_roles.read to read tenant_roles only', () => {
    const ability = defineAbilityFor({
      permissions: ['tenant_roles.read'],
      claims: null,
    });
    expect(ability.can('read', 'tenant_roles')).toBe(true);
    expect(ability.can('manage', 'tenant_roles')).toBe(false);
  });

  it('grants manage on every app subject when is_system_admin', () => {
    const ability = defineAbilityFor({
      permissions: [],
      claims: { is_system_admin: true },
    });
    expect(ability.can('manage', 'schedules')).toBe(true);
    expect(ability.can('read', 'schedules')).toBe(true);
    expect(ability.can('lock', 'attendance')).toBe(true);
    expect(ability.can('manage', 'basic_rates')).toBe(true);
    expect(ability.can('manage', 'tenants')).toBe(true);
    expect(ability.can('manage', 'tenant_roles')).toBe(true);
  });

  it('maps tenants.manage to manage tenants when in permissions list', () => {
    const ability = defineAbilityFor({
      permissions: ['tenants.manage'],
      claims: null,
    });
    expect(ability.can('manage', 'tenants')).toBe(true);
  });

  it('does not grant catalog-only permissions when not in JWT list', () => {
    const ability = defineAbilityFor({
      permissions: ['basic_rates.read'],
      claims: null,
    });
    expect(ability.can('read', 'basic_rates')).toBe(true);
    expect(ability.can('manage', 'basic_rates')).toBe(false);
    expect(ability.can('read', 'projects')).toBe(false);
  });
});
