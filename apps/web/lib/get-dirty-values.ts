import type { FieldValues } from 'react-hook-form';

/**
 * Picks only the dirty fields from form values, walking nested dirty markers
 * recursively. Returns a flat-ish partial of `values` matching the shape of
 * `dirtyFields`.
 */
export function getDirtyValues<T extends FieldValues>(
  values: T,
  dirtyFields: Partial<Record<string, unknown>>
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, dirty] of Object.entries(dirtyFields)) {
    if (dirty === true) {
      result[key] = values[key];
    } else if (dirty != null && typeof dirty === 'object' && !Array.isArray(dirty)) {
      result[key] = getDirtyValues(
        values[key] as FieldValues,
        dirty as Record<string, unknown>
      );
    }
  }
  return result as Partial<T>;
}
