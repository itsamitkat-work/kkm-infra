'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { Form } from '@/components/ui/form';
import {
  FormDrawerHeader,
  FormInputField,
  FormSection,
} from '@/components/form';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { TenantAdminRow } from '@/hooks/use-tenants-admin';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const tenantFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  display_name: z.string().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      SLUG_REGEX,
      'Lowercase letters, numbers, and single hyphens between segments only',
    ),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

type TenantDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tenant: TenantAdminRow | null;
  onSaved: () => void;
};

function getDefaults(
  mode: 'create' | 'edit',
  tenant: TenantAdminRow | null,
): TenantFormValues {
  if (mode === 'create' || !tenant) {
    return { name: '', display_name: '', slug: '' };
  }
  return {
    name: tenant.name,
    display_name: tenant.display_name ?? '',
    slug: tenant.slug,
  };
}

export function TenantDrawer({
  open,
  onOpenChange,
  mode,
  tenant,
  onSaved,
}: TenantDrawerProps) {
  const isMobile = useIsMobile();
  const isEdit = mode === 'edit';
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: getDefaults(mode, tenant),
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (open) {
      form.reset(getDefaults(mode, tenant));
    }
  }, [open, mode, tenant, form]);

  function handleClose() {
    onOpenChange(false);
  }

  function handleDrawerOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(values: TenantFormValues) {
    const supabase = createSupabaseBrowserClient();
    setIsSaving(true);
    try {
      if (isEdit && tenant) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: values.name.trim(),
            display_name: values.display_name?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenant.id);

        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Tenant updated');
      } else {
        const { error } = await supabase.from('tenants').insert({
          name: values.name.trim(),
          display_name: values.display_name?.trim() || null,
          slug: values.slug.trim(),
          settings: {},
        });

        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Tenant created');
      }
      onSaved();
      handleClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      direction={isMobile ? 'bottom' : 'right'}
      open={open}
      onOpenChange={handleDrawerOpenChange}
    >
      <DrawerContent className='sm:max-w-lg'>
        <FormDrawerHeader
          title={isEdit ? 'Edit tenant' : 'Add tenant'}
          submitButtonText={isEdit ? 'Save' : 'Create'}
          formId='tenant-form'
          control={form.control}
          onCancel={handleClose}
          isLoading={isSaving}
          allowSubmitWhenNotDirty={isEdit}
        />

        <DrawerContentContainer>
          <Form {...form}>
            <form
              id='tenant-form'
              onSubmit={form.handleSubmit(handleSubmit)}
              className='flex flex-col gap-6'
            >
              <FormSection title='Details' showSeparator={false}>
                <FormInputField
                  control={form.control}
                  name='name'
                  label='Name'
                  placeholder='Legal or internal name'
                  required
                />
                <FormInputField
                  control={form.control}
                  name='display_name'
                  label='Display name'
                  placeholder='Shown in the product'
                />
                <FormInputField
                  control={form.control}
                  name='slug'
                  label='Slug'
                  placeholder='e.g. acme-corp'
                  required={!isEdit}
                  readOnly={isEdit}
                  description={
                    isEdit ? (
                      <>
                        Slug cannot be changed. Current:{' '}
                        <span className='font-mono'>{tenant?.slug}</span>
                      </>
                    ) : (
                      'Unique key; lowercase letters, numbers, and hyphens only.'
                    )
                  }
                />
              </FormSection>
            </form>
          </Form>
        </DrawerContentContainer>
      </DrawerContent>
    </Drawer>
  );
}
