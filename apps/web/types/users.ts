export interface UserRole {
  name: string;
  hashId: string;
}

export interface User extends Record<string, unknown> {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  isActive: boolean;
  roles: UserRole[];
}

