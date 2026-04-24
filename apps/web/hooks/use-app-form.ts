'use client';

import * as React from 'react';
import type { BaseSyntheticEvent } from 'react';
import {
  useForm,
  useFormState,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';

import { buildDirtyPatch } from '@/lib/rhf-dirty-patch';

export type AppFormSubmitMode = 'create' | 'edit';

export type ExtendEditPatchContext<T extends FieldValues> = {
  patch: Partial<T>;
  values: T;
  isDirty: boolean;
  registeredDefaultValues: Partial<T> | undefined;
};

/**
 * App form wrapper around `useForm`.
 * Defaults: React Hook Form `mode` is `'all'`; in `submitMode: 'edit'`, empty
 * dirty patches show `toast.message('No changes to save')` unless `onEmptyPatch`
 * is set (use a no-op to silence).
 */
export type UseAppFormParams<T extends FieldValues> = Omit<
  UseFormProps<T>,
  'defaultValues'
> & {
  /**
   * create → POST full values via onCreate.
   * edit → PATCH dirty subset via onPatch (unless forceFullUpdate).
   * Named submitMode so it does not clash with React Hook Form's `mode`.
   */
  submitMode: AppFormSubmitMode;
  defaultValues: DefaultValues<T>;
  onCreate?: (data: T) => void | Promise<void>;
  onPatch?: (patch: Partial<T>, full: T) => void | Promise<void>;
  /** edit: ignore dirty map and pass full values as the patch object. */
  forceFullUpdate?: boolean;
  /**
   * edit: invoked when the computed patch is empty.
   * Defaults to `toast.message('No changes to save')` when omitted and
   * `submitMode` is `'edit'`. Pass a no-op to silence.
   */
  onEmptyPatch?: () => void;
  /** edit: refine patch after buildDirtyPatch (e.g. field-array edge cases). */
  extendEditPatch?: (ctx: ExtendEditPatchContext<T>) => Partial<T>;
  /** Runs after validation; return false to abort (show toasts inside). */
  beforeSubmit?: (values: T) => boolean | Promise<boolean>;
};

export type UseAppFormReturn<T extends FieldValues> = UseFormReturn<T> & {
  submit: (e?: BaseSyntheticEvent) => Promise<void>;
  isEdit: boolean;
  isCreate: boolean;
};

type ConfigRef<T extends FieldValues> = {
  submitMode: AppFormSubmitMode;
  onCreate?: (data: T) => void | Promise<void>;
  onPatch?: (patch: Partial<T>, full: T) => void | Promise<void>;
  forceFullUpdate: boolean;
  onEmptyPatch?: () => void;
  extendEditPatch?: (ctx: ExtendEditPatchContext<T>) => Partial<T>;
  beforeSubmit?: (values: T) => boolean | Promise<boolean>;
};

export function useAppForm<T extends FieldValues>(
  params: UseAppFormParams<T>
): UseAppFormReturn<T> {
  const {
    submitMode,
    defaultValues,
    onCreate,
    onPatch,
    forceFullUpdate = false,
    onEmptyPatch,
    extendEditPatch,
    beforeSubmit,
    mode = 'all',
    ...formProps
  } = params;

  const form = useForm<T>({
    ...formProps,
    mode,
    defaultValues,
  });

  const { dirtyFields, isDirty, defaultValues: registeredDefaultValues } =
    useFormState({
      control: form.control,
      disabled: submitMode === 'create',
    });

  const resolvedOnEmptyPatch =
    onEmptyPatch ??
    (submitMode === 'edit'
      ? () => {
          toast.message('No changes to save');
        }
      : undefined);

  const configRef = React.useRef<ConfigRef<T>>({
    submitMode,
    onCreate,
    onPatch,
    forceFullUpdate,
    onEmptyPatch: resolvedOnEmptyPatch,
    extendEditPatch,
    beforeSubmit,
  });
  configRef.current = {
    submitMode,
    onCreate,
    onPatch,
    forceFullUpdate,
    onEmptyPatch: resolvedOnEmptyPatch,
    extendEditPatch,
    beforeSubmit,
  };

  const dirtyRef = React.useRef({
    dirtyFields,
    isDirty,
    registeredDefaultValues,
  });
  dirtyRef.current = {
    dirtyFields,
    isDirty,
    registeredDefaultValues,
  };

  const submit = React.useMemo(
    () =>
      form.handleSubmit(async (values) => {
        const c = configRef.current;
        const d = dirtyRef.current;

        if (c.beforeSubmit) {
          const ok = await c.beforeSubmit(values);
          if (ok === false) {
            return;
          }
        }

        if (c.submitMode === 'create') {
          if (c.onCreate) {
            await c.onCreate(values);
          }
          return;
        }

        let patch: Partial<T>;
        if (c.forceFullUpdate) {
          patch = { ...values } as Partial<T>;
        } else {
          patch = buildDirtyPatch(values, {
            dirtyFields: d.dirtyFields,
            isDirty: d.isDirty,
          });
          if (c.extendEditPatch) {
            patch = c.extendEditPatch({
              patch,
              values,
              isDirty: d.isDirty,
              registeredDefaultValues:
                d.registeredDefaultValues as Partial<T> | undefined,
            });
          }
        }

        if (Object.keys(patch).length === 0) {
          c.onEmptyPatch?.();
          return;
        }

        if (c.onPatch) {
          await c.onPatch(patch, values);
        }
      }),
    [form]
  );

  return React.useMemo(
    () =>
      ({
        ...form,
        submit,
        isEdit: submitMode === 'edit',
        isCreate: submitMode === 'create',
      }) as UseAppFormReturn<T>,
    [form, submit, submitMode]
  );
}
