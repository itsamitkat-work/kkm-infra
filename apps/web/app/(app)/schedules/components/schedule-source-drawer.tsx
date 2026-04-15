'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormSelectField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import type { ScheduleSourceRow } from '@/hooks/schedules/use-schedule-sources';
import {
  useCreateScheduleSource,
  useUpdateScheduleSource,
} from '@/hooks/schedules/use-schedule-source-mutations';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';
import type { Database } from '@kkm/db';

const SCHEDULE_TYPE_OPTIONS: Array<{
  value: Database['public']['Enums']['schedule_source_type'];
  label: string;
}> = [
  { value: 'govt', label: 'Government' },
  { value: 'private', label: 'Private' },
];

const RECORD_STATUS_OPTIONS_DB: Array<{
  value: Database['public']['Enums']['record_status'];
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'deprecated', label: 'Deprecated' },
];

const FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Name is required'),
  display_name: z.string().min(1, 'Display name is required'),
  type: z.union([z.enum(['govt', 'private']), z.literal('')]).optional(),
  status: z.enum(['active', 'inactive', 'deprecated']),
});

type ScheduleSourceFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  scheduleSource?: ScheduleSourceRow | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ScheduleSourceDrawer({
  mode,
  scheduleSource,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createMutation = useCreateScheduleSource();
  const updateMutation = useUpdateScheduleSource();

  const getDefaultValues = React.useCallback((): ScheduleSourceFormValues => {
    if (mode === 'create' || !scheduleSource) {
      return {
        name: '',
        display_name: '',
        type: undefined,
        status: 'active',
      };
    }

    return {
      name: scheduleSource.name || '',
      display_name: scheduleSource.display_name || '',
      type: scheduleSource.type ?? undefined,
      status:
        (scheduleSource.status as ScheduleSourceFormValues['status']) ??
        'active',
    };
  }, [mode, scheduleSource]);

  const form = useForm<ScheduleSourceFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [scheduleSource?.id, mode, getDefaultValues, form]);

  async function handleSubmit(values: ScheduleSourceFormValues) {
    try {
      const type =
        values.type === 'govt' || values.type === 'private' ? values.type : null;

      if (isEdit && scheduleSource) {
        await updateMutation.mutateAsync({
          id: scheduleSource.id,
          patch: {
            name: values.name,
            display_name: values.display_name,
            type,
            status: values.status,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          display_name: values.display_name,
          type,
          status: values.status,
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting schedule source:', error);
    }
  }

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead
            ? 'View schedule'
            : isEdit
              ? 'Edit schedule'
              : 'Create schedule'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='schedule-source-form'
        control={form.control}
        readOnly={isRead}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='schedule-source-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            {(isEdit || isRead) && (
              <p className='text-muted-foreground text-sm leading-snug'>
                Use the expand control on this schedule in the table to add or
                manage editions (versions). Editions determine what appears in
                schedule items and basic rates.
              </p>
            )}
            <ScheduleSourceFieldsSection
              control={form.control}
              readOnly={isRead}
            />
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const ScheduleSourceFieldsSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ScheduleSourceFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Schedule source' showSeparator={false}>
      <FormInputField
        control={control}
        name='name'
        label='Name'
        placeholder='Internal name / key'
        required
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name='display_name'
        label='Display name'
        placeholder='Label shown in lists'
        required
        readOnly={readOnly}
      />
      <FormSelectField
        control={control}
        name='type'
        label='Type'
        placeholder='Select type'
        options={SCHEDULE_TYPE_OPTIONS}
        readOnly={readOnly}
      />
      <FormSelectField
        control={control}
        name='status'
        label='Status'
        placeholder='Select status'
        options={RECORD_STATUS_OPTIONS_DB}
        required
        readOnly={readOnly}
      />
    </FormSection>
  )
);

ScheduleSourceFieldsSection.displayName = 'ScheduleSourceFieldsSection';
