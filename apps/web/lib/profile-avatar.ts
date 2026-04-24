/**
 * Default avatar image when `profiles.avatar_url` (or similar) is missing or blank.
 * Used across project team, admin users, and other profile avatars.
 */
export const PROFILE_AVATAR_FALLBACK_SRC =
  'https://github.com/evilrabbit.png';

export function resolveProfileAvatarSrc(
  avatarUrl: string | null | undefined,
): string {
  const trimmed = avatarUrl?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return PROFILE_AVATAR_FALLBACK_SRC;
}
