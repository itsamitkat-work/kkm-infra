import type { FieldValues } from 'react-hook-form';

function dirtyMarkerContainsTrue(marker: unknown): boolean {
  if (marker === true) {
    return true;
  }
  if (marker == null || typeof marker !== 'object') {
    return false;
  }
  if (Array.isArray(marker)) {
    for (const item of marker) {
      if (dirtyMarkerContainsTrue(item)) {
        return true;
      }
    }
    return false;
  }
  for (const v of Object.values(marker)) {
    if (dirtyMarkerContainsTrue(v)) {
      return true;
    }
  }
  return false;
}

/**
 * Picks only the dirty fields from form values, walking nested dirty markers
 * recursively. Returns a flat-ish partial of `values` matching the shape of
 * `dirtyFields`.
 *
 * Field arrays (`useFieldArray`) report `dirtyFields` entries as arrays of
 * per-index markers (for example `[{ is_default: true }, {}]`). Those are
 * treated as dirty for the parent key and the current `values[key]` is used.
 */
export function getDirtyValues<T extends FieldValues>(
  values: T,
  dirtyFields: Partial<Record<string, unknown>>
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, dirty] of Object.entries(dirtyFields)) {
    if (dirty === true) {
      result[key] = values[key];
    } else if (Array.isArray(dirty) && dirtyMarkerContainsTrue(dirty)) {
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
