import type { FieldValues, FormState } from 'react-hook-form';

import { getDirtyValues } from '@/lib/get-dirty-values';

type MinimalDirtyFormState<T extends FieldValues> = Pick<
  FormState<T>,
  'dirtyFields' | 'isDirty'
>;

/**
 * Returns a patch object containing only fields RHF marks as dirty.
 * Pass `dirtyFields` / `isDirty` from a subscribed source (e.g. `useFormState`
 * in `useAppForm`); reading `form.formState` only inside submit can stay stale.
 */
export function buildDirtyPatch<T extends FieldValues>(
  values: T,
  formState: MinimalDirtyFormState<T>
): Partial<T> {
  if (!formState.isDirty) return {};
  return getDirtyValues(
    values,
    formState.dirtyFields as Partial<Record<string, unknown>>
  );
}
