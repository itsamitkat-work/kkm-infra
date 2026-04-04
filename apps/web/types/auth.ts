export interface User {
  hashId?: string;
  userName: string;
  phone: string;
  email: string;
  designation: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
  permissionslist: { permissions: string[]; roles: string[] };
}

export interface LoginCredentials {
  phone: string;
  password: string;
}
