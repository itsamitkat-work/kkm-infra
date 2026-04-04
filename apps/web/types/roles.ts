export interface Role extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  isSystemRole: boolean;
  isActive: boolean;
}

