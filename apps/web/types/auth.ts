/** App user shape (legacy API fields + Supabase profile). */
export interface User {
  /** Business user id from API when synced; falls back to Supabase auth user id. */
  hashId?: string;
  userName: string;
  phone: string;
  email: string;
  designation: string | null;
  /** From `user_metadata` (e.g. OAuth `avatar_url` / `picture`). */
  avatarUrl?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
