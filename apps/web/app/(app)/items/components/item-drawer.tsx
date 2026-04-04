'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormSelectField,
  FormDrawerHeader,
  FormSection,
  FormTextareaField,
} from '@/components/form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { useClients } from '@/hooks/clients/use-clients';
import { useCreateItem, useUpdateItem } from '@/hooks/items/use-item-mutations';
import { useItemById } from '@/hooks/items/use-item-by-id';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { MasterItem } from '@/hooks/items/types';
import { useMasterTypesList } from '@/hooks/use-master-types';
import { cn } from '@/lib/utils';

const ITEM_CATEGORY = {
  head: 'head',
  sub_head: 'sub_head',
  finished_item: 'finished_item',
} as const;
type ItemCategory = (typeof ITEM_CATEGORY)[keyof typeof ITEM_CATEGORY];

const FORM_SCHEMA = z
  .object({
    itemCategory: z.union([
      z.enum(['head', 'sub_head', 'finished_item']),
      z.literal(''),
    ]),
    head: z.string().optional(),
    subHead: z.string().optional(),
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    unit: z.string().optional(),
    nickName: z.string().optional(),
    rate: z
      .string()
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          val === '' ||
          (!isNaN(Number(val)) && Number(val) >= 0),
        {
          message: 'Rate must be a valid number',
        }
      ),
    scheduleRate: z.string().min(1, 'Schedule is required'),
    dsrCode: z.string().optional(),
    remark: z.string().optional(),
  })
  .refine((data) => data.itemCategory !== '', {
    message: 'Please select an item category',
    path: ['itemCategory'],
  })
  .refine(
    (data) => {
      if (data.itemCategory !== 'finished_item') return true;
      return (data.unit?.length ?? 0) > 0;
    },
    { message: 'Unit is required', path: ['unit'] }
  )
  .refine(
    (data) => {
      if (data.itemCategory !== 'finished_item') return true;
      const rate = data.rate?.trim();
      return (
        (rate?.length ?? 0) > 0 && !isNaN(Number(rate)) && Number(rate) >= 0
      );
    },
    { message: 'Rate is required', path: ['rate'] }
  );

type ItemFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  item?: MasterItem | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ItemDrawer({ mode, item, open, onSubmit, onCancel }: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';
  const router = useRouter();
  const [createJustification, setCreateJustification] = React.useState(false);

  // Fetch from API only when we have item.hashId (edit/read). Create/copy: no fetch.
  const hashIdToLoad = item?.hashId ? item.hashId : undefined;
  const { data: itemFromApi, isLoading: isItemLoading } =
    useItemById(hashIdToLoad);

  // Form data: use API result when we fetched, else passed item (copy) or null (create).
  const formItem = itemFromApi ?? item ?? null;

  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const { labelValues: unitOptions } = useMasterTypesList('Unit');
  const { data: clients } = useClients();

  const scheduleOptions = React.useMemo(
    () =>
      (clients ?? []).map((c) => ({
        value: c.scheduleName,
        label: c.scheduleName,
      })),
    [clients]
  );

  const defaultValues = React.useMemo(() => {
    const hasHead = Boolean(formItem?.head?.trim());
    const hasSubHead = Boolean(formItem?.subhead?.trim());
    const itemCategory: ItemCategory | '' =
      hasHead && hasSubHead ? 'sub_head' : hasHead ? 'head' : 'finished_item';
    return {
      itemCategory,
      head: formItem?.head ?? '',
      subHead: formItem?.subhead ?? '',
      code: formItem?.code ?? '',
      name: formItem?.name ?? '',
      unit: formItem?.unit ?? '',
      nickName: formItem?.nickName ?? '',
      rate: formItem != null ? String(formItem.rate ?? 0) : '',
      scheduleRate: formItem?.scheduleRate ?? '',
      dsrCode: formItem?.dsrCode ?? '',
      remark: getItemRemark(formItem),
    };
  }, [formItem]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues,
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const itemCategory = form.watch('itemCategory');
  const scheduleRate = form.watch('scheduleRate');
  const isDsrSchedule = scheduleRate === 'DSR';

  const showUnitDropdown = itemCategory === 'finished_item';

  React.useEffect(() => {
    if (isDsrSchedule) return;
    if (itemCategory === 'head' || itemCategory === 'sub_head') {
      form.setValue('itemCategory', 'finished_item', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [form, isDsrSchedule, itemCategory]);

  function getParentId(): string {
    return formItem?.parentId ?? '';
  }

  async function handleSubmit(values: ItemFormValues) {
    try {
      if (isEdit && formItem?.hashId) {
        await updateItemMutation.mutateAsync({
          hashId: formItem.hashId,
          parentId:
            values.itemCategory === 'finished_item' ? undefined : getParentId(),
          head: '',
          subHead: '',
          name: values.name,
          unit: values.unit ?? '',
          nickName: values.nickName ?? '',
          rate: Number(values.rate ?? 0),
          scheduleRate: values.scheduleRate,
          clientHashId:
            clients?.find((c) => c.scheduleName === values.scheduleRate)
              ?.hashId ?? '',
          dsrCode: values.dsrCode ?? '',
          code: formItem.code,
          types:
            values.itemCategory === 'finished_item' ? 'FinishedItem' : null,
        });
      } else {
        const createdItemResponse = await createItemMutation.mutateAsync({
          parentId:
            values.itemCategory === 'finished_item' ? undefined : getParentId(),
          head: '',
          subHead: '',
          code: values.code,
          name: values.name,
          unit: values.unit ?? '',
          nickName: values.nickName ?? '',
          rate: Number(values.rate ?? 0),
          scheduleRate: values.scheduleRate,
          clientHashId:
            clients?.find((c) => c.scheduleName === values.scheduleRate)
              ?.hashId ?? '',
          dsrCode: values.dsrCode ?? '',
          types:
            values.itemCategory === 'finished_item' ? 'FinishedItem' : null,
        });

        if (createJustification) {
          const createdItemId = getCreatedItemId(createdItemResponse);
          if (createdItemId) {
            router.push(
              `/items/${createdItemId}?tab=justification&createJustification=1`
            );
          }
          return;
        }

        const scheduleRate = values.scheduleRate;
        const itemCategory = values.itemCategory;
        form.reset({
          itemCategory,
          scheduleRate,
          head: '',
          subHead: '',
          code: '',
          name: '',
          unit: '',
          nickName: '',
          rate: '',
          dsrCode: '',
          remark: '',
        });
        return;
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting item:', error);
    }
  }

  const isPending =
    createItemMutation.isPending || updateItemMutation.isPending;
  const showItemLoading = (isEdit || isRead) && isItemLoading;

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={isRead ? 'View Item' : isEdit ? 'Edit Item' : 'Create Item'}
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='item-form'
        control={form.control}
        readOnly={isRead}
        isLoading={isPending}
      />

      <DrawerContentContainer>
        <AnimatePresence mode='wait'>
          {showItemLoading ? (
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
                  id='item-form'
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className='flex flex-col gap-6'
                >
                  <FormSection title='' showSeparator={false}>
                    <div className='grid grid-cols-1 gap-4'>
                      <FormTextareaField
                        control={form.control}
                        name='name'
                        label='Name'
                        placeholder='Enter name'
                        required
                        readOnly={isRead}
                      />
                      <FormInputField
                        control={form.control}
                        name='nickName'
                        label='Nick Name'
                        placeholder='Enter nick name'
                        readOnly={isRead}
                      />
                    </div>
                    <div className='max-w-[50%]'>
                      <FormSelectField
                        control={form.control}
                        name='scheduleRate'
                        label='Schedule'
                        placeholder='Select schedule'
                        options={scheduleOptions}
                        required
                        readOnly={isRead}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name='itemCategory'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item category</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                              className='flex flex-row gap-3'
                            >
                              <div className='flex items-center gap-2'>
                                <RadioGroupItem
                                  value='head'
                                  id='item-category-head'
                                  disabled={isRead || !isDsrSchedule}
                                />
                                <Label
                                  htmlFor='item-category-head'
                                  className={cn('cursor-pointer font-normal', {
                                    'text-muted-foreground cursor-not-allowed':
                                      isRead || !isDsrSchedule || !scheduleRate,
                                  })}
                                >
                                  Head
                                </Label>
                              </div>
                              <div className='flex items-center gap-2'>
                                <RadioGroupItem
                                  value='sub_head'
                                  id='item-category-sub-head'
                                  disabled={isRead || !isDsrSchedule}
                                />
                                <Label
                                  htmlFor='item-category-sub-head'
                                  className={cn('cursor-pointer font-normal', {
                                    'text-muted-foreground cursor-not-allowed':
                                      isRead || !isDsrSchedule || !scheduleRate,
                                  })}
                                >
                                  Semi Finished Item
                                </Label>
                              </div>
                              <div className='flex items-center gap-2'>
                                <RadioGroupItem
                                  value='finished_item'
                                  id='item-category-finished'
                                  disabled={isRead}
                                />
                                <Label
                                  htmlFor='item-category-finished'
                                  className='cursor-pointer font-normal'
                                >
                                  Finished Item
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <AnimatePresence initial={false}>
                      {showUnitDropdown && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className='grid grid-cols-2 gap-4 overflow-hidden'
                        >
                          <FormInputField
                            control={form.control}
                            name='rate'
                            label='Rate'
                            placeholder='0'
                            type='number'
                            required
                            readOnly={isRead}
                          />
                          <FormSelectField
                            control={form.control}
                            name='unit'
                            label='Unit'
                            placeholder='Select unit'
                            options={unitOptions}
                            required
                            readOnly={isRead}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className='grid grid-cols-2 gap-4'>
                      <FormInputField
                        control={form.control}
                        name='code'
                        label='Code'
                        placeholder='Enter code'
                        required
                        readOnly={isRead || isEdit}
                      />
                      <FormInputField
                        control={form.control}
                        name='dsrCode'
                        label='Nick Code'
                        placeholder='Enter Nick code'
                        readOnly={isRead}
                      />
                    </div>
                    <FormTextareaField
                      control={form.control}
                      name='remark'
                      label='Remark'
                      placeholder='Enter remark'
                      readOnly={isRead}
                    />
                    {!isEdit && !isRead && (
                      <div className='flex items-center gap-2 pt-2'>
                        <Checkbox
                          id='create-justification'
                          checked={createJustification}
                          onCheckedChange={handleCreateJustificationChange}
                        />
                        <Label
                          htmlFor='create-justification'
                          className='cursor-pointer'
                        >
                          Create Justification
                        </Label>
                      </div>
                    )}
                  </FormSection>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContentContainer>
    </DrawerWrapper>
  );

  function handleCreateJustificationChange(
    checked: boolean | 'indeterminate'
  ): void {
    setCreateJustification(checked === true);
  }

  function getCreatedItemId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;

    const data = response as {
      hashId?: string;
      id?: string;
      data?: string | { hashId?: string; id?: string };
      result?: { hashId?: string; id?: string };
      item?: { hashId?: string; id?: string };
    };

    const nestedData =
      typeof data.data === 'object' && data.data !== null ? data.data : null;
    const dataId = typeof data.data === 'string' ? data.data : null;

    return (
      data.hashId ??
      data.id ??
      dataId ??
      nestedData?.hashId ??
      nestedData?.id ??
      data.result?.hashId ??
      data.result?.id ??
      data.item?.hashId ??
      data.item?.id ??
      null
    );
  }

  function getItemRemark(currentItem: MasterItem | null): string {
    if (!currentItem) return '';
    const itemWithRemark = currentItem as MasterItem & { remark?: string | null };
    return itemWithRemark.remark ?? '';
  }
}
