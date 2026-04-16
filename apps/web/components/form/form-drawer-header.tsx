'use client';

import * as React from 'react';
import { Control, useFormState } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DrawerClose, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';

/**
 * A reusable FormDrawerHeader component that provides a consistent header layout
 * for form drawers with title, description, cancel, and submit buttons.
 *
 * This component is memoized to prevent unnecessary re-renders when only
 * isDirty or isValid props change, optimizing performance.
 *
 * @example
 * ```tsx
 * <FormDrawerHeader
 *   title="Create Project"
 *   description="Create a new project with the following details"
 *   submitButtonText="Create"
 *   formId="project-form"
 *   control={form.control}
 * />
 * ```
 */
interface FormDrawerHeaderProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  title: string;
  description?: string;
  submitButtonText: string;
  formId: string;
  control: Control<T>;
  onCancel?: () => void;
  className?: string;
  readOnly?: boolean;
  allowSubmitWhenNotDirty?: boolean; // Allow submit button to be enabled even when form is not dirty (useful for copy operations)
  isLoading?: boolean;
}

function FormDrawerHeaderComponent<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  title,
  description,
  submitButtonText,
  formId,
  control,
  onCancel,
  className,
  readOnly = false,
  allowSubmitWhenNotDirty = false,
  isLoading = false,
}: FormDrawerHeaderProps<T>) {
  const { isDirty, isValid } = useFormState({
    control,
  });

  return (
    <DrawerHeader
      className={`flex flex-row items-center justify-between gap-4 ${
        className || ''
      }`}
    >
      <div className='flex flex-col gap-1'>
        <DrawerTitle>{title}</DrawerTitle>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      <div className='flex gap-2'>
        <DrawerClose asChild>
          <Button
            size='sm'
            variant='outline'
            onClick={onCancel}
            disabled={isLoading}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
        </DrawerClose>
        {!readOnly && (
          <Button
            type='submit'
            size='sm'
            form={formId}
            disabled={
              allowSubmitWhenNotDirty
                ? !isValid || isLoading
                : !isDirty || !isValid || isLoading
            }
          >
            {isLoading && <Loader2 className='h-3 w-3 animate-spin' />}
            {submitButtonText}
          </Button>
        )}
      </div>
    </DrawerHeader>
  );
}

export const FormDrawerHeader = React.memo(
  FormDrawerHeaderComponent
) as typeof FormDrawerHeaderComponent;

(
  FormDrawerHeader as React.MemoExoticComponent<
    typeof FormDrawerHeaderComponent
  >
).displayName = 'FormDrawerHeader';
