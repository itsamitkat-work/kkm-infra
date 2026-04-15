import {
  PostgresErrorCode,
  type SupabaseErrorMessageMap,
} from '@/lib/supabase/errors';

/**
 * Extend when schedule source writes need code-specific copy (RLS, uniqueness, etc.).
 */
export const scheduleSourceMutationMessages: SupabaseErrorMessageMap = {};

/**
 * User-facing copy for schedule source version mutations (unique per source on `name`).
 */
export const scheduleSourceVersionMutationMessages: SupabaseErrorMessageMap = {
  postgres: {
    [PostgresErrorCode.UniqueViolation]:
      'An edition with this internal name already exists for this schedule.',
  },
};
