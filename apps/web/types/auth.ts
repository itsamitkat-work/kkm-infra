/** App user shape (legacy API fields + Supabase profile). */
export interface User {
  /** Business user id from API when synced; falls back to Supabase auth user id. */
  hashId?: string;
  userName: string;
  phone: string;
  email: string;
  designation: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
