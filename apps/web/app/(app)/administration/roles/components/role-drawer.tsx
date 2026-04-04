'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { useCreateRole, useUpdateRole } from '../hooks/use-roles-query';
import { Role } from '@/types/roles';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { OpenCloseMode } from '@/hooks/use-open-close';

const FORM_SCHEMA = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  isSystemRole: z.boolean(),
  isActive: z.boolean(),
});

type RoleFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  role?: Role | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RoleDrawer({
  mode,
  role,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  const defaultValues: RoleFormValues = React.useMemo(() => {
    if (role && (isEdit || isRead)) {
      return {
        code: role.code,
        name: role.name,
        isSystemRole: role.isSystemRole,
        isActive: role.isActive,
      };
    }

    return {
      code: '',
      name: '',
      isSystemRole: false,
      isActive: true,
    };
  }, [role, isEdit, isRead]);

  const form = useForm({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues,
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  async function handleSubmit(values: RoleFormValues) {
    try {
      if (isEdit && role) {
        await updateRoleMutation.mutateAsync({
          id: role.id,
          code: values.code,
          name: values.name,
          isActive: values.isActive,
        });
      } else {
        await createRoleMutation.mutateAsync({
          code: values.code,
          name: values.name,
          isSystemRole: values.isSystemRole,
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting role:', error);
    }
  }

  const isPending =
    createRoleMutation.isPending || updateRoleMutation.isPending;

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead
            ? 'View Role'
            : isEdit
              ? 'Edit Role'
              : 'Create Role'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='role-form'
        control={form.control}
        readOnly={isRead}
        isLoading={isPending}
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='role-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <FormSection title='Role Details' showSeparator={false}>
              <FormInputField
                control={form.control}
                name='code'
                label='Code'
                placeholder='Enter role code'
                required
                readOnly={isRead}
              />

              <FormInputField
                control={form.control}
                name='name'
                label='Name'
                placeholder='Enter role name'
                required
                readOnly={isRead}
              />

              {!isEdit && (
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='isSystemRole'
                    checked={form.watch('isSystemRole')}
                    onCheckedChange={(checked) =>
                      form.setValue('isSystemRole', checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    disabled={isRead}
                  />
                  <Label
                    htmlFor='isSystemRole'
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    System Role
                  </Label>
                </div>
              )}

              {isEdit && (
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='isActive'
                    checked={form.watch('isActive')}
                    onCheckedChange={(checked) =>
                      form.setValue('isActive', checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    disabled={isRead}
                  />
                  <Label
                    htmlFor='isActive'
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    Active
                  </Label>
                </div>
              )}
            </FormSection>
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}
