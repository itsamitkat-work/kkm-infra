'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormSelectField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { useProjectServiceItems } from '../hooks/use-project-service-items';
import { useCreatePrnServiceItemMutation } from '../hooks/use-prn-service-item-mutations';
import { flattenItemDescription } from '@/app/(app)/schedule-items/item-description-doc';

const FORM_SCHEMA = z.object({
  serviceItemId: z.string().min(1, 'Service item is required'),
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Quantity must be greater than 0',
    }),
});

type FormValues = z.infer<typeof FORM_SCHEMA>;

interface CreateServiceItemPrnDrawerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateServiceItemPrnDrawer({
  projectId,
  open,
  onOpenChange,
}: CreateServiceItemPrnDrawerProps) {
  const { data: serviceItems = [], isLoading: loadingItems } =
    useProjectServiceItems(projectId);
  const createMutation = useCreatePrnServiceItemMutation(projectId);

  const serviceItemOptions = React.useMemo(
    () =>
      serviceItems.map((item) => {
        const id = item.id ?? '';
        return {
          value: id,
          label: `${item.item_code ?? ''} – ${flattenItemDescription(item.item_description)}`.trim(),
        };
      }),
    [serviceItems]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: { serviceItemId: '', quantity: '1' },
    mode: 'all',
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({ serviceItemId: '', quantity: '1' });
  }, [open, form]);

  async function handleSubmit(values: FormValues) {
    const selectedItem = serviceItems.find(
      (item) => item.id === values.serviceItemId
    );
    if (!selectedItem) return;
    const projectItemHashId = selectedItem.id ?? '';
    const userItemCode = selectedItem.item_code ?? '';
    const qty = Number(values.quantity);
    if (!projectItemHashId || !userItemCode) return;

    try {
      const res = await createMutation.mutateAsync({
        projectItemHashId,
        userItemCode,
        userRequestedQuantity: qty,
      });
      if (res?.isSuccess) {
        onOpenChange(false);
      }
    } catch {
      // Error toast handled in mutation
    }
  }

  const isPending = createMutation.isPending;
  const showLoading = loadingItems;

  return (
    <DrawerWrapper open={open} onClose={() => onOpenChange(false)}>
      <FormDrawerHeader
        title='Add PRN Service Item'
        submitButtonText='Create'
        formId='create-service-item-prn-form'
        control={form.control}
        allowSubmitWhenNotDirty
        isLoading={isPending}
      />

      <DrawerContentContainer>
        <AnimatePresence mode='wait'>
          {showLoading ? (
            <motion.div
              key='loading'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='flex items-center justify-center py-12'
            >
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            </motion.div>
          ) : (
            <motion.div
              key='form'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Form {...form}>
                <form
                  id='create-service-item-prn-form'
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className='flex flex-col gap-6'
                >
                  <FormSection title='' showSeparator={false}>
                    <div className='grid grid-cols-1 gap-4'>
                      <FormSelectField
                        control={form.control}
                        name='serviceItemId'
                        label='Service Item'
                        placeholder='Select service item'
                        options={serviceItemOptions}
                        required
                      />
                      <FormInputField
                        control={form.control}
                        name='quantity'
                        label='Quantity'
                        placeholder='1'
                        type='number'
                        required
                      />
                    </div>
                  </FormSection>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}
