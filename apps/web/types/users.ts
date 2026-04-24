export interface UserRole {
  name: string;
  hashId: string;
}

export interface User extends Record<string, unknown> {
  id: string;
  /** public.tenant_members.id when the row is loaded from the tenant directory. */
  tenantMemberId?: string;
  userName: string;
  fullName: string;
  /** From `profiles.avatar_url` when loaded from tenant directory. */
  avatarUrl?: string | null;
  email: string;
  isActive: boolean;
  roles: UserRole[];
}

