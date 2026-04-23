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
import {
  useCreatePrnServiceItemMutation,
  useUpdatePrnServiceItemMutation,
} from '../hooks/use-prn-service-item-mutations';
import type { PrnServiceItemRow } from '../hooks/use-prn-service-items-by-project';
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

export type ServiceItemPrnDrawerMode = 'create' | 'edit';

interface ServiceItemPrnDrawerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ServiceItemPrnDrawerMode;
  initialRow?: PrnServiceItemRow | null;
}

export function ServiceItemPrnDrawer({
  projectId,
  open,
  onOpenChange,
  mode,
  initialRow,
}: ServiceItemPrnDrawerProps) {
  const { data: serviceItems = [], isLoading: loadingItems } =
    useProjectServiceItems(projectId);
  const createMutation = useCreatePrnServiceItemMutation(projectId);
  const updateMutation = useUpdatePrnServiceItemMutation(projectId);

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

  const isEdit = mode === 'edit';
  const defaultServiceItemId =
    isEdit && initialRow ? (initialRow.ID ?? '') : '';
  const defaultQuantity =
    isEdit && initialRow ? String(initialRow.Quantity) : '1';

  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: {
      serviceItemId: defaultServiceItemId,
      quantity: defaultQuantity,
    },
    mode: 'all',
  });

  React.useEffect(() => {
    if (!open) return;
    if (isEdit && initialRow) {
      form.reset({
        serviceItemId: initialRow.ID ?? '',
        quantity: String(initialRow.Quantity),
      });
    } else {
      form.reset({ serviceItemId: '', quantity: '1' });
    }
  }, [open, isEdit, initialRow, form]);

  async function handleSubmit(values: FormValues) {
    try {
      if (isEdit && initialRow) {
        await updateMutation.mutateAsync({
          payload: {
            id: initialRow.ID,
            projectItemHashId: values.serviceItemId,
            userItemCode: initialRow.serviceItemCode,
            userRequestedQuantity: Number(values.quantity),
            isChecked: 0,
            isVerified: 0,
          },
        });
      } else {
        const selectedItem = serviceItems.find(
          (item) => item.id === values.serviceItemId
        );
        if (!selectedItem) return;
        const projectItemHashId = selectedItem.id ?? '';
        const userItemCode = selectedItem.item_code ?? '';
        const qty = Number(values.quantity);
        if (!projectItemHashId || !userItemCode) return;
        await createMutation.mutateAsync({
          projectItemHashId,
          userItemCode,
          userRequestedQuantity: qty,
        });
      }
      onOpenChange(false);
    } catch {
      // Error toast handled in mutation
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const showLoading = loadingItems;

  const title = isEdit
    ? 'Update PRN Service Item'
    : 'Add PRN Service Item';
  const submitLabel = isEdit ? 'Update' : 'Create';

  return (
    <DrawerWrapper open={open} onClose={() => onOpenChange(false)}>
      <FormDrawerHeader
        title={title}
        submitButtonText={submitLabel}
        formId='service-item-prn-drawer-form'
        control={form.control}
        allowSubmitWhenNotDirty={!isEdit}
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
          ) : !isEdit && serviceItems.length === 0 ? (
            <motion.div
              key='empty'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground px-4'
            >
              <p>No service items in this project.</p>
              <p className='mt-2'>
                Add service items to the project first, then you can create a
                PRN service item.
              </p>
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
                  id='service-item-prn-drawer-form'
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
