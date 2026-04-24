import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types/auth';

export function mapSupabaseUserToAppUser(user: SupabaseUser): User {
  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const avatarFromMeta =
    meta?.avatar_url?.trim() ||
    meta?.picture?.trim() ||
    null;

  return {
    hashId: meta?.hash_id ?? user.id,
    userName:
      meta?.display_name ??
      meta?.full_name ??
      user.email?.split('@')[0] ??
      'User',
    phone: user.phone ?? meta?.phone ?? '',
    email: user.email ?? '',
    designation: meta?.designation ?? null,
    avatarUrl: avatarFromMeta || null,
  };
}
