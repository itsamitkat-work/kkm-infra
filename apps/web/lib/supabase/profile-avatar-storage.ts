'use client';

import type { Database } from '@kkm/db';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Must match `storage.buckets.id` in migration `avatars_storage_bucket`. */
export const PROFILE_AVATARS_BUCKET = 'avatars' as const;

const OBJECT_KEY = 'avatar';

export function getProfileAvatarStoragePath(ownerUserId: string): string {
  return `${ownerUserId}/${OBJECT_KEY}`;
}

/**
 * Uploads a profile image to Supabase Storage and returns its public URL for `profiles.avatar_url`.
 */
export async function uploadProfileAvatarToStorage(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
  file: File,
): Promise<string> {
  const path = getProfileAvatarStoragePath(ownerUserId);
  const contentType = file.type && file.type.length > 0 ? file.type : 'image/jpeg';
  const { error } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType,
    });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Removes the stored avatar object for a user.
 * Missing objects do not cause a failing response from Storage.
 */
export async function removeProfileAvatarFromStorage(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
): Promise<void> {
  const path = getProfileAvatarStoragePath(ownerUserId);
  const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}
